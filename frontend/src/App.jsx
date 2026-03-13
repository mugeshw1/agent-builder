import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import PublicChat from './pages/PublicChat'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#fafafa]">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/:agentSlug/chat" element={<PublicChat />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
