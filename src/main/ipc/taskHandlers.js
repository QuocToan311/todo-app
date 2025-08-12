const { ObjectId } = require('mongodb');
const { getCollections } = require('../database');

function registerTaskHandlers(ipcMain) {
  const { tasksCollection } = getCollections();

  ipcMain.handle('tasks-get', async (event, userId) => {
    try {
      if (!ObjectId.isValid(userId)) return { success: false, error: 'Invalid user ID' };
      const tasks = await tasksCollection
        .find({ userId: new ObjectId(userId) })
        .sort({ createdAt: -1 })
        .toArray();
      const formattedTasks = tasks.map(task => ({
        ...task,
        _id: task._id.toString(),
        userId: task.userId.toString()
      }));
      return { success: true, tasks: formattedTasks };
    } catch (error) {
      console.error('Get tasks error:', error);
      return { success: false, error: 'Không thể tải danh sách công việc' };
    }
  });

  ipcMain.handle('tasks-add', async (event, { text, priority, category, userId }) => {
    try {
      if (!ObjectId.isValid(userId)) return { success: false, error: 'Invalid user ID' };
      if (!text || !text.trim()) return { success: false, error: 'Nội dung công việc không được để trống' };
      const newTask = {
        text: text.trim(),
        priority: priority || 'medium',
        category: category || 'personal',
        userId: new ObjectId(userId),
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const result = await tasksCollection.insertOne(newTask);
      const task = { ...newTask, _id: result.insertedId.toString(), userId };
      return { success: true, task };
    } catch (error) {
      console.error('Add task error:', error);
      return { success: false, error: 'Không thể thêm công việc' };
    }
  });

  ipcMain.handle('tasks-update', async (event, { taskId, updates, userId }) => {
    try {
      if (!ObjectId.isValid(taskId) || !ObjectId.isValid(userId)) return { success: false, error: 'Invalid ID' };
      const updateData = { ...updates, updatedAt: new Date() };
      const result = await tasksCollection.findOneAndUpdate(
        { _id: new ObjectId(taskId), userId: new ObjectId(userId) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      if (!result.value) return { success: false, error: 'Không tìm thấy công việc hoặc không có quyền truy cập' };
      const task = { ...result.value, _id: result.value._id.toString(), userId: result.value.userId.toString() };
      return { success: true, task };
    } catch (error) {
      console.error('Update task error:', error);
      return { success: false, error: 'Không thể cập nhật công việc' };
    }
  });

  ipcMain.handle('tasks-delete', async (event, { taskId, userId }) => {
    try {
      if (!ObjectId.isValid(taskId) || !ObjectId.isValid(userId)) return { success: false, error: 'Invalid ID' };
      const result = await tasksCollection.deleteOne({ _id: new ObjectId(taskId), userId: new ObjectId(userId) });
      if (result.deletedCount === 0) return { success: false, error: 'Không tìm thấy công việc hoặc không có quyền truy cập' };
      return { success: true };
    } catch (error) {
      console.error('Delete task error:', error);
      return { success: false, error: 'Không thể xóa công việc' };
    }
  });
}

module.exports = { registerTaskHandlers };