import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import * as todosController from './todos.controller.js';

export const todosRouter = Router();

todosRouter.use(requireAuth);

todosRouter.get('/', todosController.getTodos);
todosRouter.post('/', todosController.createTodo);
todosRouter.patch('/:id', todosController.updateTodo);
todosRouter.delete('/:id', todosController.deleteTodo);
