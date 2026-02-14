import * as todosSQL from './todos.sql.js';
import { CreateTodoInput, UpdateTodoInput } from './todos.schemas.js';

export async function getAllTodos(userId: string) {
  return todosSQL.getAllTodos(userId);
}

export async function createTodo(userId: string, input: CreateTodoInput) {
  return todosSQL.createTodo(userId, input.title);
}

export async function updateTodo(
  id: string,
  userId: string,
  input: UpdateTodoInput
) {
  return todosSQL.updateTodo(id, userId, input);
}

export async function deleteTodo(id: string, userId: string) {
  return todosSQL.deleteTodo(id, userId);
}
