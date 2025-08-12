const { getCollections } = require('../database');

function registerAuthHandlers(ipcMain) {
  const { usersCollection } = getCollections();

  ipcMain.handle('auth-login', async (event, { email, password }) => {
    try {
      const user = await usersCollection.findOne({ email });
      if (!user) return { success: false, error: 'Email không tồn tại' };
      if (user.password !== password) return { success: false, error: 'Mật khẩu không đúng' };
      const userInfo = { id: user._id.toString(), name: user.name, email: user.email };
      return { success: true, user: userInfo };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Lỗi server khi đăng nhập' };
    }
  });

  ipcMain.handle('auth-register', async (event, { name, email, password }) => {
    try {
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) return { success: false, error: 'Email đã được sử dụng' };
      const newUser = { name: name.trim(), email: email.trim().toLowerCase(), password, createdAt: new Date() };
      const result = await usersCollection.insertOne(newUser);
      const userInfo = { id: result.insertedId.toString(), name: newUser.name, email: newUser.email };
      return { success: true, user: userInfo };
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 11000) return { success: false, error: 'Email đã được sử dụng' };
      return { success: false, error: 'Lỗi server khi đăng ký' };
    }
  });
}

module.exports = { registerAuthHandlers };