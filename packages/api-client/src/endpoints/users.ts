import { apiClient } from '../client';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  businessId: string;
  createdAt: string;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export const getUsers = async (): Promise<User[]> => {
  const res = await apiClient.get('/users');
  return res.data;
};

export const createUser = async (data: CreateUserDto): Promise<User> => {
  const res = await apiClient.post('/users', data);
  return res.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`/users/${id}`);
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  businessId?: string | null;
  createdAt: string;
  isAvailable?: boolean;
  profilePhotoUrl?: string | null;
}

export interface CreateAdminUserDto {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: string;
  businessId?: string | null;
}

export interface ResetAdminUserPasswordDto {
  newPassword: string;
}

export interface UpdateAdminUserStatusDto {
  isActive: boolean;
}

export const getAdminUsers = async (params?: { businessId?: string }): Promise<AdminUser[]> => {
  const res = await apiClient.get('/admin/users', { params });
  return res.data;
};

export const createAdminUser = async (data: CreateAdminUserDto): Promise<AdminUser> => {
  const res = await apiClient.post('/admin/users', data);
  return res.data;
};

export const resetAdminUserPassword = async (
  id: string,
  data: ResetAdminUserPasswordDto,
): Promise<{ message: string; userId: string }> => {
  const res = await apiClient.patch(`/admin/users/${id}/password`, data);
  return res.data;
};

export const updateAdminUserStatus = async (
  id: string,
  data: UpdateAdminUserStatusDto,
): Promise<AdminUser> => {
  const res = await apiClient.patch(`/admin/users/${id}/status`, data);
  return res.data;
};

