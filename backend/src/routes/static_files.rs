//! Serving the statically exported Next.js frontend.
//!
//! Two things a plain `ServeDir` gets wrong for a Next.js static export:
//!
//! - Routes are exported as `<route>.html` (e.g. `mail.html`), so `/mail` would
//!   redirect to `/mail/`, miss, and fall back to `index.html` (the login page),
//!   which then client-side redirects back to `/mail`. Serve `<route>.html` directly.
//! - Without `Cache-Control`, browsers heuristically cache HTML and RSC payloads
//!   (`*.txt`). After a deploy they can mix files from two builds, which makes the
//!   Next.js router fall back to hard reloads. HTML/RSC must revalidate on every
//!   load; hashed assets under `/_next/static/` never change and can be cached forever.

use std::path::{Component, Path, PathBuf};
use std::sync::Arc;

use axum::Router;
use axum::extract::{Request, State};
use axum::http::{HeaderValue, StatusCode, Uri, header};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use tower_http::services::{ServeDir, ServeFile};

const IMMUTABLE: &str = "public, max-age=31536000, immutable";
const REVALIDATE: &str = "no-cache";

pub fn router(static_dir: &str) -> Router {
    let index_path = Path::new(static_dir).join("index.html");
    let serve = ServeDir::new(static_dir).fallback(ServeFile::new(index_path));
    Router::new()
        .fallback_service(serve)
        .layer(middleware::from_fn_with_state(
            Arc::new(PathBuf::from(static_dir)),
            static_headers,
        ))
}

async fn static_headers(
    State(static_dir): State<Arc<PathBuf>>,
    mut req: Request,
    next: Next,
) -> Response {
    let immutable = req.uri().path().starts_with("/_next/static/");

    // A missing hashed asset (e.g. a page from an older build asking for its
    // chunks) must 404, not fall back to index.html with a forever cache.
    if immutable && !asset_exists(&static_dir, req.uri().path()) {
        return StatusCode::NOT_FOUND.into_response();
    }

    if let Some(uri) = html_route_uri(&static_dir, req.uri()) {
        *req.uri_mut() = uri;
    }

    let mut res = next.run(req).await;
    res.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static(if immutable { IMMUTABLE } else { REVALIDATE }),
    );
    res
}

fn asset_exists(static_dir: &Path, path: &str) -> bool {
    let rel = Path::new(path.trim_start_matches('/'));
    rel.components().all(|c| matches!(c, Component::Normal(_))) && static_dir.join(rel).is_file()
}

/// `/mail` or `/mail/` -> `/mail.html` when that file exists in the export.
fn html_route_uri(static_dir: &Path, uri: &Uri) -> Option<Uri> {
    let route = uri.path().trim_matches('/');
    if route.is_empty() {
        return None;
    }
    let rel = Path::new(route);
    if rel.extension().is_some() || !rel.components().all(|c| matches!(c, Component::Normal(_))) {
        return None;
    }
    if !static_dir.join(format!("{route}.html")).is_file() {
        return None;
    }
    let path_and_query = match uri.query() {
        Some(q) => format!("/{route}.html?{q}"),
        None => format!("/{route}.html"),
    };
    path_and_query.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_exported_routes_only() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("mail.html"), "").unwrap();
        let map = |p: &str| html_route_uri(dir.path(), &p.parse().unwrap()).map(|u| u.to_string());

        assert_eq!(map("/mail").as_deref(), Some("/mail.html"));
        assert_eq!(map("/mail/").as_deref(), Some("/mail.html"));
        assert_eq!(map("/mail?x=1").as_deref(), Some("/mail.html?x=1"));
        assert_eq!(map("/"), None);
        assert_eq!(map("/missing"), None);
        assert_eq!(map("/mail.txt"), None);
        assert_eq!(map("/../mail"), None);
    }

    #[test]
    fn asset_lookup_stays_inside_static_dir() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::create_dir_all(dir.path().join("_next/static/chunks")).unwrap();
        std::fs::write(dir.path().join("_next/static/chunks/a.js"), "").unwrap();

        assert!(asset_exists(dir.path(), "/_next/static/chunks/a.js"));
        assert!(!asset_exists(dir.path(), "/_next/static/chunks/old.js"));
        assert!(!asset_exists(dir.path(), "/_next/static/chunks/"));
        assert!(!asset_exists(dir.path(), "/_next/static/../../etc/passwd"));
    }
}
