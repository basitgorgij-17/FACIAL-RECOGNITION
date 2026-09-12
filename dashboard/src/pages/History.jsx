import { useState, useEffect } from 'react'
import supabase from '../supabaseClient'

function History() {
  const [logs, setLogs] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
    fetchUsers()
    fetchLogs()
  }, [])

  async function fetchUsers() {
    const { data, error } = await supabase.from('profiles').select('id, name')
    if (error) {
      console.log('Error fetching users:', error)
    } else {
      setUsers(data)
    }
  }

  async function fetchLogs() {
    let query = supabase
      .from('audit_logs')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })

    if (selectedUser) {
      query = query.eq('user_id', selectedUser)
    }

    if (selectedDate) {
      query = query.gte('created_at', `${selectedDate}T00:00:00`)
      query = query.lte('created_at', `${selectedDate}T23:59:59`)
    }

    const { data, error } = await query

    if (error) {
      console.log('Error fetching logs:', error)
    } else {
      setLogs(data)
    }
  }

  function handleClearFilters() {
    setSelectedUser('')
    setSelectedDate('')
  }

  return (
    <div className="watchlist-page">
      <h1 className="watchlist-heading">Audit History</h1>

      <div className="filters-bar">
        <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
          <option value="">All Users</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />

        <button onClick={fetchLogs}>Apply Filters</button>
        <button onClick={handleClearFilters} className="cancel-btn">Clear</button>
      </div>

      {logs.length === 0 && <p className="empty-text">No history found.</p>}

      <div className="history-list">
        {logs.map((log) => (
          <div key={log.id} className="history-row">
            <div className="history-main">
              <p className="history-action">{log.action}</p>
              <p className="history-user">{log.profiles?.name || 'Unknown user'}</p>
            </div>
            <p className="history-time">
              {new Date(log.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default History