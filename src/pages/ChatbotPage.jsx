import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import ChatAuthGate from '../components/ChatAuthGate'
import './ChatbotPage.css'

const IconSend = () => <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M2 10l16-7-6 16-2.5-6.5L2 10z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>
const IconMic = () => <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.6"/><path d="M4 9.5a6 6 0 0012 0M10 15.5v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
const IconCamera = () => <svg width="19" height="19" viewBox="0 0 20 20" fill="none"><path d="M2 6.5A1.5 1.5 0 013.5 5H6l1-2h6l1 2h2.5A1.5 1.5 0 0118 6.5v9A1.5 1.5 0 0116.5 17h-13A1.5 1.5 0 012 15.5v-9z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><circle cx="10" cy="10.5" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>
const IconDots = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="4" r="1.4" fill="currentColor"/><circle cx="10" cy="10" r="1.4" fill="currentColor"/><circle cx="10" cy="16" r="1.4" fill="currentColor"/></svg>
const IconPlus = () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>

const SUGGESTIONS = ['سعر الطماطم النهاردة', 'كيف أعالج بياض القمح؟', 'ما أحسن محصول للصيف؟']

const MAX_IMAGE_SIDE = 1024
const CONNECTION_ERROR = 'في مشكلة في الاتصال، حاول تاني بعد شوية.'

// بيصغّر الصورة ويضغطها JPEG قبل الإرسال عشان النت الضعيف
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      canvas.toBlob((blob) => (blob ? resolve({ blob, dataUrl }) : reject(new Error('compress failed'))), 'image/jpeg', 0.8)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')) }
    img.src = url
  })
}

function ChatbotInner() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [showHistoryMenu, setShowHistoryMenu] = useState(false)
  const [recentConversations, setRecentConversations] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    loadRecentConversations()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadRecentConversations() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('chat_conversations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3)
    setRecentConversations(data || [])
  }

  async function openConversation(id) {
    setConversationId(id)
    setShowHistoryMenu(false)
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
    const rows = data || []
    // الصور في bucket خاص، فبنجيب لينكات مؤقتة (ساعة) لعرضها
    const paths = rows.map((m) => m.image_path).filter(Boolean)
    const urlMap = {}
    if (paths.length) {
      const { data: signed } = await supabase.storage.from('chat-images').createSignedUrls(paths, 3600)
      ;(signed || []).forEach((x) => { if (x.path && x.signedUrl) urlMap[x.path] = x.signedUrl })
    }
    setMessages(rows.map((m) => ({ from: m.role === 'user' ? 'user' : 'bot', text: m.content, image: m.image_path ? urlMap[m.image_path] : null })))
  }

  function startNewConversation() {
    setConversationId(null)
    setMessages([])
    setShowHistoryMenu(false)
  }

  async function handleImageSelect(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const { blob, dataUrl } = await compressImage(file)
      setSelectedImage(blob)
      setImagePreview(dataUrl)
    } catch {
      alert('معرفتش أفتح الصورة دي، جرّب صورة تانية.')
    }
  }

  function toggleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('متصفحك مش بيدعم الإدخال الصوتي — جرب Chrome')
      return
    }
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'ar-EG'
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setInput((prev) => prev + transcript)
    }
    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsRecording(true)
  }

  async function ensureConversation(user, firstMessage) {
    if (conversationId) return conversationId
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ user_id: user.id, title: (firstMessage || '').slice(0, 40) || 'محادثة جديدة' })
      .select()
      .single()
    if (error) return null
    setConversationId(data.id)
    loadRecentConversations()
    return data.id
  }

  async function sendMessage(text) {
    if (loading) return
    const msg = (text || input).trim()
    if (!msg && !selectedImage) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('لازم تسجل دخول عشان تستخدم المساعد الذكي'); return }

    const convId = await ensureConversation(user, msg)

    const userImagePreview = imagePreview
    setMessages((prev) => [...prev, { from: 'user', text: msg, image: userImagePreview }])
    setInput('')
    setLoading(true)

    const pushError = (text) => setMessages((prev) => [...prev, { from: 'bot', text, error: true }])

    if (!convId) {
      pushError(CONNECTION_ERROR)
      setLoading(false)
      return
    }
    if (!navigator.onLine) {
      pushError('مفيش نت دلوقتي. اتأكد من الاتصال وحاول تاني.')
      setLoading(false)
      return
    }

    // الصورة بتترفع لـ bucket خاص في فولدر باسم المستخدم، والـ Edge Function هي اللي بتقراها
    let imagePath = null
    if (selectedImage) {
      const path = `${user.id}/${Date.now()}.jpg`
      const { error: upErr } = await supabase.storage.from('chat-images').upload(path, selectedImage, { contentType: 'image/jpeg' })
      if (upErr) {
        pushError('معرفتش أرفع الصورة. جرّب تاني.')
        setLoading(false)
        return
      }
      imagePath = path
    }
    setSelectedImage(null)
    setImagePreview(null)

    // الرسايل (سؤالك ورد المساعد) بتتسجل في الداتابيز من الـ Edge Function نفسها
    let timer
    try {
      const { data, error } = await Promise.race([
        supabase.functions.invoke('chat-assistant', { body: { conversation_id: convId, message: msg, image_path: imagePath } }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), 70000) }),
      ])
      if (error || !data?.reply) {
        let text = CONNECTION_ERROR
        try {
          const j = await error?.context?.json()
          if (j?.error) text = j.error
        } catch { /* نستخدم الرسالة العامة */ }
        pushError(text)
      } else {
        setMessages((prev) => [...prev, { from: 'bot', text: data.reply }])
      }
    } catch {
      pushError(CONNECTION_ERROR)
    } finally {
      clearTimeout(timer)
    }
    setLoading(false)
  }

  const isEmpty = messages.length === 0

  return (
    <div className="gemini-chat-page">
      <div className="gemini-chat-topbar">
        <h1>المساعد الزراعي الذكي</h1>
        <div className="gemini-menu-wrapper">
          <button className="gemini-dots-btn" onClick={() => setShowHistoryMenu(!showHistoryMenu)}><IconDots /></button>
          {showHistoryMenu && (
            <div className="gemini-history-dropdown">
              <button className="history-item new-chat" onClick={startNewConversation}><IconPlus /> محادثة جديدة</button>
              {recentConversations.length > 0 && <div className="history-divider">آخر المحادثات</div>}
              {recentConversations.map((c) => (
                <button className="history-item" key={c.id} onClick={() => openConversation(c.id)}>{c.title}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="gemini-chat-body">
        {isEmpty ? (
          <div className="gemini-empty-state">
            <div className="gemini-empty-icon">🌾</div>
            <h2>إزيك، أنا فلّاحي</h2>
            <p>اسألني عن أي حاجة في الزراعة</p>
            <div className="gemini-suggestions">
              {SUGGESTIONS.map((q) => (
                <button key={q} className="gemini-suggestion-chip" onClick={() => sendMessage(q)}>{q}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="gemini-messages">
            {messages.map((m, i) => (
              <div key={i} className={`gemini-msg ${m.from}`}>
                {m.image && <img src={m.image} alt="" className="gemini-msg-image" />}
                {m.text && <div className="gemini-bubble">{m.text}</div>}
              </div>
            ))}
            {loading && <div className="gemini-msg bot"><div className="gemini-bubble typing"><span></span><span></span><span></span></div></div>}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="gemini-input-area">
        {imagePreview && (
          <div className="gemini-image-preview-row">
            <img src={imagePreview} alt="preview" />
            <button onClick={() => { setSelectedImage(null); setImagePreview(null) }}>✕</button>
          </div>
        )}
        <div className="gemini-input-pill">
          <label className="gemini-icon-btn">
            <IconCamera />
            <input type="file" accept="image/*" hidden onChange={handleImageSelect} />
          </label>
          <input
            className="gemini-input-field"
            placeholder="اسأل فلّاحي عن أي حاجة..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && sendMessage()}
          />
          <button className={`gemini-icon-btn ${isRecording ? 'recording' : ''}`} onClick={toggleVoiceInput}><IconMic /></button>
          <button className="gemini-send-btn" onClick={() => sendMessage()} disabled={loading}><IconSend /></button>
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--tl)', margin: '8px 0 0' }}>
          الردود إرشادية وتشخيص الصور مبدئي. راجع المرشد الزراعي قبل استخدام أي مبيد.
        </p>
      </div>
    </div>
  )
}

function ChatbotPage() {
  return (
    <ChatAuthGate>
      <ChatbotInner />
    </ChatAuthGate>
  )
}

export default ChatbotPage