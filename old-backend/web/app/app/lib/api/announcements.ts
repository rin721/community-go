import { API_ENDPOINTS } from "./endpoints";
import { apiClient } from "./runtime";
import type {
  Announcement,
  AnnouncementPage,
  PublicAnnouncement,
  PublicAnnouncementPage,
} from "./types";

type RequestOptions = {
  signal?: AbortSignal;
};

export type AnnouncementListQuery = {
  endCreatedAt?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
  startCreatedAt?: string;
  status?: string;
};

export type AnnouncementInput = {
  content: string;
  status?: string;
  summary?: string;
  title: string;
};

export type AnnouncementUpdateInput = {
  content?: string;
  status?: string;
  summary?: string;
  title?: string;
};

export const announcementsApi = {
  archiveAnnouncement: (announcementId: number | string, options: RequestOptions = {}) =>
    apiClient.request<Announcement>(API_ENDPOINTS.announcements.archive(announcementId), {
      method: "POST",
      signal: options.signal,
    }),
  createAnnouncement: (body: AnnouncementInput, options: RequestOptions = {}) =>
    apiClient.request<Announcement>(API_ENDPOINTS.announcements.collection, {
      body,
      method: "POST",
      signal: options.signal,
    }),
  deleteAnnouncement: (announcementId: number | string, options: RequestOptions = {}) =>
    apiClient.request<{ deleted: boolean }>(API_ENDPOINTS.announcements.item(announcementId), {
      method: "DELETE",
      signal: options.signal,
    }),
  getAnnouncement: (announcementId: number | string, options: RequestOptions = {}) =>
    apiClient.request<Announcement>(API_ENDPOINTS.announcements.item(announcementId), {
      signal: options.signal,
    }),
  getPublicAnnouncement: (announcementId: number | string, options: RequestOptions = {}) =>
    apiClient.request<PublicAnnouncement>(API_ENDPOINTS.announcements.publicItem(announcementId), {
      signal: options.signal,
    }),
  listAnnouncements: (query: AnnouncementListQuery = {}, options: RequestOptions = {}) =>
    apiClient.request<AnnouncementPage>(API_ENDPOINTS.announcements.collection, {
      query,
      signal: options.signal,
    }),
  listPublicAnnouncements: (query: AnnouncementListQuery = {}, options: RequestOptions = {}) =>
    apiClient.request<PublicAnnouncementPage>(API_ENDPOINTS.announcements.publicCollection, {
      query,
      signal: options.signal,
    }),
  publishAnnouncement: (announcementId: number | string, options: RequestOptions = {}) =>
    apiClient.request<Announcement>(API_ENDPOINTS.announcements.publish(announcementId), {
      method: "POST",
      signal: options.signal,
    }),
  updateAnnouncement: (
    announcementId: number | string,
    body: AnnouncementUpdateInput,
    options: RequestOptions = {},
  ) =>
    apiClient.request<Announcement>(API_ENDPOINTS.announcements.item(announcementId), {
      body,
      method: "PATCH",
      signal: options.signal,
    }),
};
