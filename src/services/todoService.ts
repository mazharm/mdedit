import { graphGet, graphPost, graphPatch, graphDelete, GetTokenFn, GraphResponse } from './graphService';

/** Validate that an ID is safe for use in Graph API URL paths. */
function validateId(id: string): string {
  if (!id || /[/\\?#&]/.test(id)) {
    throw new Error(`Invalid ID: ${id}`);
  }
  return id;
}

export interface TaskInput {
  title: string;
  body?: string;
  dueDate?: Date;
}

interface TodoTask {
  id: string;
  title: string;
  status: string;
  body?: {
    content: string;
    contentType: string;
  };
  dueDateTime?: {
    dateTime: string;
    timeZone: string;
  };
}

interface TodoTaskList {
  id: string;
  displayName: string;
}

const TASK_LIST_NAME = 'MDEdit Comments';

async function getOrCreateTaskList(getToken: GetTokenFn): Promise<string> {
  try {
    // Try to find existing task list
    const listsResponse = await graphGet<GraphResponse<TodoTaskList>>(
      getToken,
      '/me/todo/lists'
    );

    const existingList = listsResponse.value.find(
      (list) => list.displayName === TASK_LIST_NAME
    );

    if (existingList) {
      return existingList.id;
    }

    // Create new task list
    const newList = await graphPost<TodoTaskList>(getToken, '/me/todo/lists', {
      displayName: TASK_LIST_NAME,
    });

    return newList.id;
  } catch (error) {
    console.error('Failed to get or create task list:', error);
    throw error;
  }
}

export async function createTask(
  getToken: GetTokenFn,
  task: TaskInput
): Promise<TodoTask> {
  try {
    const listId = await getOrCreateTaskList(getToken);

    const taskBody: Record<string, unknown> = {
      title: task.title.substring(0, 255), // Title has max length
    };

    if (task.body) {
      taskBody.body = {
        content: task.body,
        contentType: 'text',
      };
    }

    if (task.dueDate) {
      // Format as local date in ISO format
      const localDate = task.dueDate.toISOString().split('T')[0];
      taskBody.dueDateTime = {
        dateTime: `${localDate}T00:00:00`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    const createdTask = await graphPost<TodoTask>(
      getToken,
      `/me/todo/lists/${listId}/tasks`,
      taskBody
    );

    return createdTask;
  } catch (error) {
    console.error('Failed to create task:', error);
    throw error;
  }
}

export async function completeTask(
  getToken: GetTokenFn,
  taskId: string,
  listId?: string
): Promise<void> {
  try {
    const actualListId = validateId(listId || (await getOrCreateTaskList(getToken)));
    const safeTaskId = validateId(taskId);

    await graphPatch<TodoTask>(
      getToken,
      `/me/todo/lists/${actualListId}/tasks/${safeTaskId}`,
      { status: 'completed' }
    );
  } catch (error) {
    console.error('Failed to complete task:', error);
    throw error;
  }
}

export async function uncompleteTask(
  getToken: GetTokenFn,
  taskId: string,
  listId?: string
): Promise<void> {
  try {
    const actualListId = validateId(listId || (await getOrCreateTaskList(getToken)));
    const safeTaskId = validateId(taskId);

    await graphPatch<TodoTask>(
      getToken,
      `/me/todo/lists/${actualListId}/tasks/${safeTaskId}`,
      { status: 'notStarted' }
    );
  } catch (error) {
    console.error('Failed to uncomplete task:', error);
    throw error;
  }
}

export async function deleteTask(
  getToken: GetTokenFn,
  taskId: string,
  listId?: string
): Promise<void> {
  try {
    const actualListId = validateId(listId || (await getOrCreateTaskList(getToken)));
    const safeTaskId = validateId(taskId);

    await graphDelete(getToken, `/me/todo/lists/${actualListId}/tasks/${safeTaskId}`);
  } catch (error) {
    console.error('Failed to delete task:', error);
    throw error;
  }
}
