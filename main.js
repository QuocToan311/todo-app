const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

// MongoDB configuration
const MONGODB_URI = 'mongodb+srv://toan:toandz@cluster0.2iv1cdk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
let client;
let db;
let usersCollection;
let tasksCollection;

// Connect to MongoDB
async function connectMongo() {
  try {
    if (!MONGODB_URI) {
      throw new Error("MongoDB URI is not defined");
    }
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log("Successfully connected to MongoDB!");
    
    db = client.db("todo_app");
    usersCollection = db.collection("users");
    tasksCollection = db.collection("tasks");
    
    // Create indexes for better performance
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await tasksCollection.createIndex({ userId: 1 });
    
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    throw err;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    titleBarStyle: 'hidden',
    frame: false
  });

  win.loadFile('index.html');

  // Window control handlers
  ipcMain.handle('window-minimize', () => win.minimize());
  ipcMain.handle('window-maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });
  ipcMain.handle('window-close', () => win.close());
}

// Authentication handlers
ipcMain.handle('auth-login', async (event, { email, password }) => {
  try {
    console.log('Login attempt for:', email);
    
    const user = await usersCollection.findOne({ email });
    if (!user) {
      return { success: false, error: 'Email không tồn tại' };
    }
    
    // In production, you should hash passwords
    if (user.password !== password) {
      return { success: false, error: 'Mật khẩu không đúng' };
    }
    
    const userInfo = {
      id: user._id.toString(),
      name: user.name,
      email: user.email
    };
    
    return { success: true, user: userInfo };
    
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: 'Lỗi server khi đăng nhập' };
  }
});

ipcMain.handle('auth-register', async (event, { name, email, password }) => {
  try {
    console.log('Register attempt for:', email);
    
    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return { success: false, error: 'Email đã được sử dụng' };
    }
    
    // Create new user
    const newUser = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password, // In production, hash this password
      createdAt: new Date()
    };
    
    const result = await usersCollection.insertOne(newUser);
    
    const userInfo = {
      id: result.insertedId.toString(),
      name: newUser.name,
      email: newUser.email
    };
    
    return { success: true, user: userInfo };
    
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11000) {
      return { success: false, error: 'Email đã được sử dụng' };
    }
    return { success: false, error: 'Lỗi server khi đăng ký' };
  }
});

// Task management handlers
ipcMain.handle('tasks-get', async (event, userId) => {
  try {
    console.log('Getting tasks for user:', userId);
    
    if (!ObjectId.isValid(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    
    const tasks = await tasksCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
    
    // Convert ObjectId to string for frontend
    const formattedTasks = tasks.map(task => ({
      ...task,
      _id: task._id.toString(),
      userId: task.userId.toString()
    }));
    
    return { success: true, tasks: formattedTasks };
    
  } catch (error) {
    console.error("Get tasks error:", error);
    return { success: false, error: 'Không thể tải danh sách công việc' };
  }
});

ipcMain.handle('tasks-add', async (event, { text, priority, category, userId }) => {
  try {
    console.log('Adding task for user:', userId);
    
    if (!ObjectId.isValid(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    
    if (!text || !text.trim()) {
      return { success: false, error: 'Nội dung công việc không được để trống' };
    }
    
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
    
    // Return formatted task
    const task = {
      ...newTask,
      _id: result.insertedId.toString(),
      userId: userId
    };
    
    return { success: true, task };
    
  } catch (error) {
    console.error("Add task error:", error);
    return { success: false, error: 'Không thể thêm công việc' };
  }
});

ipcMain.handle('tasks-update', async (event, { taskId, updates, userId }) => {
  try {
    console.log('Updating task:', taskId, 'for user:', userId);
    
    if (!ObjectId.isValid(taskId) || !ObjectId.isValid(userId)) {
      return { success: false, error: 'Invalid ID' };
    }
    
    const updateData = {
      ...updates,
      updatedAt: new Date()
    };
    
    const result = await tasksCollection.findOneAndUpdate(
      { 
        _id: new ObjectId(taskId), 
        userId: new ObjectId(userId) 
      },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      return { success: false, error: 'Không tìm thấy công việc hoặc không có quyền truy cập' };
    }
    
    // Format the returned task
    const task = {
      ...result.value,
      _id: result.value._id.toString(),
      userId: result.value.userId.toString()
    };
    
    return { success: true, task };
    
  } catch (error) {
    console.error("Update task error:", error);
    return { success: false, error: 'Không thể cập nhật công việc' };
  }
});

ipcMain.handle('tasks-delete', async (event, { taskId, userId }) => {
  try {
    console.log('Deleting task:', taskId, 'for user:', userId);
    
    if (!ObjectId.isValid(taskId) || !ObjectId.isValid(userId)) {
      return { success: false, error: 'Invalid ID' };
    }
    
    const result = await tasksCollection.deleteOne({
      _id: new ObjectId(taskId),
      userId: new ObjectId(userId)
    });
    
    if (result.deletedCount === 0) {
      return { success: false, error: 'Không tìm thấy công việc hoặc không có quyền truy cập' };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error("Delete task error:", error);
    return { success: false, error: 'Không thể xóa công việc' };
  }
});

// App lifecycle
app.whenReady().then(async () => {
  try {
    await connectMongo();
    createWindow();
    
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (client) {
      client.close();
    }
    app.quit();
  }
});

// Graceful shutdown
app.on('before-quit', async () => {
  if (client) {
    await client.close();
  }
});