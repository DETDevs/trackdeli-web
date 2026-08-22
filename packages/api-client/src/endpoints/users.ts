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
