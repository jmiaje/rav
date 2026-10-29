"use client";

import { create, type UseBoundStore, type StoreApi } from "zustand";

import type { AnimationMode } from "@/lib/motion/config";

const STORAGE_KEY = "rav-ui-settings";

interface PersistedSettings {
  sidebarWidth: number;
  messageListWidth: number;
  sidebarCollapsed: boolean;
  readingPaneVisible: boolean;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  sidebarWidth: 200,
  messageListWidth: 420,
  sidebarCollapsed: false,
  readingPaneVisible: true,
};

function loadSettings(): PersistedSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sidebarWidth: parsed.sidebarWidth ?? DEFAULT_SETTINGS.sidebarWidth,
        messageListWidth: parsed.messageListWidth ?? DEFAULT_SETTINGS.messageListWidth,
        sidebarCollapsed: parsed.sidebarCollapsed ?? DEFAULT_SETTINGS.sidebarCollapsed,
        readingPaneVisible: parsed.readingPaneVisible ?? DEFAULT_SETTINGS.readingPaneVisible,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: Partial<PersistedSettings>) {
  try {
    const current = loadSettings();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...current, ...settings }),
    );
  } catch {
    // ignore
  }
}

export type ThemeMode = "light" | "dark" | "system";

const DEFAULT_EFFECTIVE_ANIMATION_MODE: AnimationMode = "medium";

export interface AnimationModeState {
  storedMode: AnimationMode | null;
  effectiveMode: AnimationMode;
}

export interface UiState {
  activeFolder: string;
  selectedMessageUid: number | null;
  sidebarWidth: number;
  messageListWidth: number;
  /** Hide the folder sidebar (desktop). Persisted per browser. */
  sidebarCollapsed: boolean;
  /** When false, opening a message shows it full width in place of the list. Persisted per browser. */
  readingPaneVisible: boolean;
  /** Focus view: the open message fills the screen (sidebar and list hidden). Cleared when the message closes. */
  readingPaneExpanded: boolean;
  density: "compact" | "comfortable";
  theme: ThemeMode;
  searchQuery: string;
  searchActive: boolean;
  viewMode: "mail" | "contacts" | "settings" | "calendar";
  selectedMessageUids: number[];
  bulkSelectMode: boolean;
  activeTagId: string | null;
  shortcutsOpen: boolean;
  commandPaletteOpen: boolean;
  keyboardNav: boolean;
  composeFormat: "html" | "text";
  storedAnimationMode: AnimationMode | null;
  effectiveAnimationMode: AnimationMode;
  searchSortOrder: "date_desc" | "date_asc";
  searchResultCount: number | null;
  mobilePanelView: "sidebar" | "list" | "reading";
  /** Whether to render the message body as plain text instead of HTML. Persists across messages. */
  readingBodyMode: "html" | "plain";
  /** Whether to show raw email headers. Resets when navigating to a new message. */
  readingShowHeaders: boolean;

  setActiveTag: (tagId: string | null) => void;
  setActiveFolder: (folder: string) => void;
  selectMessage: (uid: number | null) => void;
  setSidebarWidth: (width: number) => void;
  setMessageListWidth: (width: number) => void;
  setReadingPaneVisible: (visible: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setReadingPaneExpanded: (expanded: boolean) => void;
  toggleReadingPaneExpanded: () => void;
  setDensity: (density: "compact" | "comfortable") => void;
  setTheme: (theme: ThemeMode) => void;
  setSearchQuery: (query: string) => void;
  setSearchActive: (active: boolean) => void;
  clearSearch: () => void;
  setViewMode: (mode: "mail" | "contacts" | "settings" | "calendar") => void;
  toggleBulkSelect: (uid: number) => void;
  selectAllMessages: (uids: number[]) => void;
  clearBulkSelection: () => void;
  setBulkSelectMode: (mode: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setKeyboardNav: (active: boolean) => void;
  setComposeFormat: (format: "html" | "text") => void;
  setAnimationModeState: (state: AnimationModeState) => void;
  isAnimationOff: () => boolean;
  setSearchSortOrder: (order: "date_desc" | "date_asc") => void;
  setSearchResultCount: (count: number | null) => void;
  setMobilePanelView: (view: "sidebar" | "list" | "reading") => void;
  setReadingBodyMode: (mode: "html" | "plain") => void;
  toggleReadingBodyMode: () => void;
  toggleReadingShowHeaders: () => void;
}

const initial = loadSettings();

export const useUiStore: UseBoundStore<StoreApi<UiState>> = create<UiState>((set) => ({
  activeFolder: "INBOX",
  selectedMessageUid: null,
  sidebarWidth: initial.sidebarWidth,
  messageListWidth: initial.messageListWidth,
  sidebarCollapsed: initial.sidebarCollapsed,
  readingPaneVisible: initial.readingPaneVisible,
  readingPaneExpanded: false,
  density: "comfortable",
  theme: "system",
  searchQuery: "",
  searchActive: false,
  viewMode: "mail",
  selectedMessageUids: [],
  bulkSelectMode: false,
  activeTagId: null,
  shortcutsOpen: false,
  commandPaletteOpen: false,
  keyboardNav: false,
  composeFormat: "html",
  storedAnimationMode: null,
  effectiveAnimationMode: DEFAULT_EFFECTIVE_ANIMATION_MODE,
  searchSortOrder: "date_desc",
  searchResultCount: null,
  mobilePanelView: "list",
  readingBodyMode: "html",
  readingShowHeaders: false,

  setActiveTag: (tagId) =>
    set({ activeTagId: tagId, selectedMessageUid: null, readingPaneExpanded: false, selectedMessageUids: [], bulkSelectMode: false, mobilePanelView: "list" }),
  setActiveFolder: (folder) =>
    set({ activeFolder: folder, activeTagId: null, selectedMessageUid: null, readingPaneExpanded: false, selectedMessageUids: [], bulkSelectMode: false, mobilePanelView: "list" }),
  selectMessage: (uid) =>
    set({
      selectedMessageUid: uid,
      mobilePanelView: uid !== null ? "reading" : "list",
      readingShowHeaders: false,
      ...(uid === null ? { readingPaneExpanded: false } : {}),
    }),
  setSidebarWidth: (width) => {
    saveSettings({ sidebarWidth: width });
    set({ sidebarWidth: width });
  },
  setMessageListWidth: (width) => {
    saveSettings({ messageListWidth: width });
    set({ messageListWidth: width });
  },
  setReadingPaneVisible: (visible) => {
    saveSettings({ readingPaneVisible: visible });
    set({ readingPaneVisible: visible });
  },
  setSidebarCollapsed: (collapsed) => {
    saveSettings({ sidebarCollapsed: collapsed });
    set({ sidebarCollapsed: collapsed });
  },
  toggleSidebarCollapsed: () => useUiStore.getState().setSidebarCollapsed(!useUiStore.getState().sidebarCollapsed),
  setReadingPaneExpanded: (expanded) => set({ readingPaneExpanded: expanded }),
  toggleReadingPaneExpanded: () => set((s) => ({ readingPaneExpanded: !s.readingPaneExpanded })),
  setDensity: (density) => set({ density }),
  setTheme: (theme) => set({ theme }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchActive: (active) => set({ searchActive: active }),
  clearSearch: () => set({ searchQuery: "", searchActive: false, searchResultCount: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  toggleBulkSelect: (uid) =>
    set((state) => {
      const exists = state.selectedMessageUids.includes(uid);
      const next = exists
        ? state.selectedMessageUids.filter((id) => id !== uid)
        : [...state.selectedMessageUids, uid];
      return {
        selectedMessageUids: next,
        bulkSelectMode: next.length > 0 ? true : state.bulkSelectMode,
      };
    }),
  selectAllMessages: (uids) => set({ selectedMessageUids: uids, bulkSelectMode: true }),
  clearBulkSelection: () => set({ selectedMessageUids: [], bulkSelectMode: false }),
  setBulkSelectMode: (mode) =>
    set({ bulkSelectMode: mode, selectedMessageUids: mode ? [] : [] }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setKeyboardNav: (active) => set({ keyboardNav: active }),
  setComposeFormat: (format) => set({ composeFormat: format }),
  setAnimationModeState: ({ storedMode, effectiveMode }) =>
    set({
      storedAnimationMode: storedMode,
      effectiveAnimationMode: effectiveMode,
    }),
  isAnimationOff: () => useUiStore.getState().effectiveAnimationMode === "off",
  setSearchSortOrder: (order) => set({ searchSortOrder: order }),
  setSearchResultCount: (count) => set({ searchResultCount: count }),
  setMobilePanelView: (view) => set({ mobilePanelView: view }),
  setReadingBodyMode: (mode) => set({ readingBodyMode: mode, readingShowHeaders: false }),
  toggleReadingBodyMode: () =>
    set((s) => ({ readingBodyMode: s.readingBodyMode === "html" ? "plain" : "html", readingShowHeaders: false })),
  toggleReadingShowHeaders: () =>
    set((s) => ({ readingShowHeaders: !s.readingShowHeaders })),
}));
