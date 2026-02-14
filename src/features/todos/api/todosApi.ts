import { http } from '../../../shared/api/http';
import type { Todo } from '../model/types';

export async function getTodos(): Promise<Todo[]> {
  return http.get<Todo[]>('/todos');
}

export async function createTodo(title: string): Promise<Todo> {
  return http.post<Todo>('/todos', { title });
}

export async function updateTodo(
  id: string,
  patch: { title?: string; completed?: boolean }
): Promise<Todo> {
  return http.patch<Todo>(`/todos/${id}`, patch);
}

export async function deleteTodo(id: string): Promise<void> {
  return http.delete<void>(`/todos/${id}`);
}
