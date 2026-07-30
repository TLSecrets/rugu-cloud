/**
 * 密码策略：≥10，拒绝 username+1234 / 1234+username 等模板
 * @param {string} username
 * @param {string} password
 * @returns {string | null} 错误信息；null 表示通过
 */
export function validatePassword(username, password) {
  const pwd = String(password || '')
  const user = String(username || '').trim()
  if (pwd.length < 10) return '密码至少 10 位'
  if (pwd.length > 128) return '密码过长'
  if (user) {
    const lower = pwd.toLowerCase()
    const u = user.toLowerCase()
    if (lower === `${u}1234` || lower === `1234${u}`) {
      return '密码过于简单，请勿使用「用户名+1234」类模板'
    }
    if (lower === u || lower === `${u}${u}`) {
      return '密码不能与用户名相同或简单重复'
    }
  }
  // 拒绝纯数字短模板
  if (/^\d{4,12}$/.test(pwd)) return '密码不能为纯数字'
  return null
}
