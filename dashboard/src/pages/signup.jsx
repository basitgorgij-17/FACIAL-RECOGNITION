import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import supabase from '../supabaseClient'

function Signup() {
  const [name, setName] = useState('')
  const [role, setRole] = useState('operator')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  async function handleSignup(e) {
    e.preventDefault()
    setErrorMsg('')

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setErrorMsg(error.message)
      return
    }

    const userId = data.user.id
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ id: userId, name: name, role: role })

    if (profileError) {
      setErrorMsg(profileError.message)
      return
    }

    navigate('/login')
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSignup}>
        <h1>Create Account</h1>

        <label>Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />

        <label>Role</label>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="operator">Operator</option>
          <option value="admin">Admin</option>
          <option value="auditor">Auditor</option>
        </select>

        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {errorMsg && <p className="error-text">{errorMsg}</p>}

        <button type="submit">Sign Up</button>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  )
}

export default Signup