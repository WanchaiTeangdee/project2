// auth.js - simple client-side auth helpers with role-based access (for demo only)

// Role definitions
const ROLES = {
  CUSTOMER: 'customer',    // ลูกค้า - ค้นหา จอง ติดต่อ
  OWNER: 'owner',          // ผู้ปล่อยเช่า - จัดการที่พักของตัวเอง
  ADMIN: 'admin'           // Admin - จัดการทั้งหมด
}

// Role permissions
const PERMISSIONS = {
  customer: ['view_listings', 'book', 'contact_owner', 'view_own_bookings'],
  owner: ['view_listings', 'manage_own_listings', 'view_bookings_for_own', 'contact_customers'],
  admin: ['view_all', 'manage_all', 'manage_users', 'view_all_bookings', 'delete_any']
}

async function hashStr(s){
  const enc = new TextEncoder().encode(s)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('')
}

function getUsers(){
  return JSON.parse(localStorage.getItem('unai_users')||'[]')
}

function saveUsers(users){
  localStorage.setItem('unai_users', JSON.stringify(users))
}

async function createUser({username,email,password,role='customer'}){
  username = String(username).trim()
  email = String(email).trim().toLowerCase()
  role = role || 'customer'
  
  if(!username || !email || !password) throw new Error('Missing fields')
  if(!Object.values(ROLES).includes(role)) throw new Error('Invalid role')
  
  const users = getUsers()
  if(users.find(u=> u.username===username)) throw new Error('Username exists')
  if(users.find(u=> u.email===email)) throw new Error('Email exists')
  
  const passwordHash = await hashStr(password)
  const newUser = {
    username,
    email,
    passwordHash,
    role,
    createdAt: new Date().toISOString()
  }
  
  users.push(newUser)
  saveUsers(users)
  return {username, email, role}
}

async function verifyUser(identifier, password){
  const users = getUsers()
  const id = String(identifier).trim()
  const hash = await hashStr(password)
  const user = users.find(u=> u.username===id || u.email===id.toLowerCase())
  if(!user) return null
  if(user.passwordHash !== hash) return null
  
  return {
    username: user.username,
    email: user.email,
    role: user.role || 'customer',
    createdAt: user.createdAt
  }
}

function setLoggedInUser(user){
  localStorage.setItem('unai_user', JSON.stringify({
    username: user.username,
    email: user.email,
    role: user.role || 'customer'
  }))
}

function getLoggedInUser(){
  const user = localStorage.getItem('unai_user')
  return user ? JSON.parse(user) : null
}

function hasPermission(permission){
  const user = getLoggedInUser()
  if(!user) return false
  const userPerms = PERMISSIONS[user.role] || []
  return userPerms.includes(permission)
}

function isRole(role){
  const user = getLoggedInUser()
  return user && user.role === role
}

function requireRole(role){
  if(!isRole(role)){
    alert('คุณไม่มีสิทธิ์เข้าถึงหน้านี้')
    window.location.href = 'index.html'
    return false
  }
  return true
}

// Admin only: Change user role
function changeUserRole(username, newRole) {
  try {
    const currentUser = getLoggedInUser()
    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, message: 'เฉพาะ Admin เท่านั้นที่สามารถเปลี่ยนบทบาทได้' }
    }
    if (!Object.values(ROLES).includes(newRole)) {
      return { success: false, message: 'บทบาทไม่ถูกต้อง' }
    }
    const users = getUsers()
    const user = users.find(u => u.username === username)
    if (!user) {
      return { success: false, message: 'ไม่พบผู้ใช้' }
    }
    user.role = newRole
    saveUsers(users)
    return { success: true, message: `เปลี่ยนบทบาทของ ${user.username} เป็น ${newRole} เรียบร้อยแล้ว`, username: user.username, role: user.role }
  } catch (e) {
    return { success: false, message: e.message || 'เกิดข้อผิดพลาด' }
  }
}

function logoutUser(){
  localStorage.removeItem('unai_user')
}

function generateToken(len=24){
  const arr = new Uint8Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('')
}

function requestPasswordReset(email){
  email = String(email).trim().toLowerCase()
  const users = getUsers()
  const user = users.find(u=> u.email===email)
  if(!user) throw new Error('User not found')
  const token = generateToken(6) // 12 hex chars
  const expires = Date.now() + 15*60*1000 // 15 minutes
  user.resetToken = token
  user.resetExpiry = expires
  saveUsers(users)
  return token
}

async function resetPassword(email, token, newPassword){
  email = String(email).trim().toLowerCase()
  const users = getUsers()
  const user = users.find(u=> u.email===email)
  if(!user) throw new Error('User not found')
  if(!user.resetToken || user.resetToken !== token) throw new Error('Invalid token')
  if(Date.now() > (user.resetExpiry || 0)) throw new Error('Token expired')
  user.passwordHash = await hashStr(newPassword)
  delete user.resetToken
  delete user.resetExpiry
  saveUsers(users)
  return true
}

// Owner Request helpers
function getOwnerRequests() {
  return JSON.parse(localStorage.getItem('unai_owner_requests') || '[]')
}

function saveOwnerRequests(requests) {
  localStorage.setItem('unai_owner_requests', JSON.stringify(requests))
}

function requestOwnerRole(username) {
  const users = getUsers()
  const user = users.find(u => u.username === username)
  if (!user) return { success: false, message: 'ไม่พบผู้ใช้' }
  if (user.role !== 'customer') return { success: false, message: 'ขอได้เฉพาะลูกค้าเท่านั้น' }
  
  const requests = getOwnerRequests()
  if (requests.find(r => r.username === username)) {
    return { success: false, message: 'คุณส่งคำขอไปแล้ว กรุณารอการอนุมัติ' }
  }
  
  requests.push({ 
    username, 
    email: user.email,
    requestedAt: new Date().toISOString() 
  })
  saveOwnerRequests(requests)
  return { success: true, message: 'ส่งคำขอเรียบร้อยแล้ว กรุณารอ Admin อนุมัติ' }
}

function approveOwnerRequest(username) {
  const requests = getOwnerRequests()
  const idx = requests.findIndex(r => r.username === username)
  if (idx === -1) return { success: false, message: 'ไม่พบคำขอ' }
  
  const users = getUsers()
  const user = users.find(u => u.username === username)
  if (!user) return { success: false, message: 'ไม่พบผู้ใช้' }
  
  user.role = 'owner'
  saveUsers(users)
  
  requests.splice(idx, 1)
  saveOwnerRequests(requests)
  
  return { success: true, message: `อนุมัติ ${username} เป็นผู้ปล่อยเช่าแล้ว` }
}

function rejectOwnerRequest(username) {
  const requests = getOwnerRequests()
  const idx = requests.findIndex(r => r.username === username)
  if (idx === -1) return { success: false, message: 'ไม่พบคำขอ' }
  
  requests.splice(idx, 1)
  saveOwnerRequests(requests)
  
  return { success: true, message: `ปฏิเสธคำขอของ ${username} แล้ว` }
}

// Update user profile
async function updateUserProfile(username, updates) {
  const users = getUsers()
  const user = users.find(u => u.username === username)
  if (!user) return { success: false, message: 'ไม่พบผู้ใช้' }
  
  // Check if email is already taken by another user
  if (updates.email) {
    const emailTaken = users.find(u => 
      u.email === updates.email && u.username !== username
    )
    if (emailTaken) {
      return { success: false, message: 'อีเมลนี้ถูกใช้แล้ว' }
    }
    user.email = updates.email
  }
  
  // Update password if provided
  if (updates.password) {
    user.passwordHash = await hashStr(updates.password)
  }
  
  saveUsers(users)
  return { success: true, message: 'อัปเดตโปรไฟล์เรียบร้อยแล้ว' }
}

// Admin edit user (can edit email, password, and role)
async function adminEditUser(username, updates) {
  const users = getUsers()
  const user = users.find(u => u.username === username)
  if (!user) return { success: false, message: 'ไม่พบผู้ใช้' }
  
  // Check if email is already taken by another user
  if (updates.email) {
    const emailTaken = users.find(u => 
      u.email === updates.email && u.username !== username
    )
    if (emailTaken) {
      return { success: false, message: 'อีเมลนี้ถูกใช้แล้ว' }
    }
    user.email = updates.email
  }
  
  // Update role if provided
  if (updates.role) {
    if (!Object.values(ROLES).includes(updates.role)) {
      return { success: false, message: 'บทบาทไม่ถูกต้อง' }
    }
    user.role = updates.role
  }
  
  // Update password if provided
  if (updates.password) {
    user.passwordHash = await hashStr(updates.password)
  }
  
  saveUsers(users)
  
  // Update current logged in user if editing self
  const currentUser = getLoggedInUser()
  if (currentUser && currentUser.username === username) {
    setLoggedInUser(user)
  }
  
  return { success: true, message: 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว' }
}

// expose for pages
window.auth = {
  ROLES,
  PERMISSIONS,
  hashStr,
  getUsers,
  saveUsers,
  createUser,
  verifyUser,
  setLoggedInUser,
  getLoggedInUser,
  logoutUser,
  hasPermission,
  isRole,
  requireRole,
  changeUserRole,
  // Owner request helpers
  getOwnerRequests,
  requestOwnerRole,
  approveOwnerRequest,
  rejectOwnerRequest,
  requestPasswordReset,
  resetPassword,
  // Profile management
  updateUserProfile,
  adminEditUser
}
