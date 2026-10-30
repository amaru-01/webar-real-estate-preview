import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Box,
  CalendarDays,
  Camera,
  Check,
  CircleHelp,
  Download,
  Grid2X2,
  LoaderCircle,
  LocateFixed,
  MoveHorizontal,
  Navigation,
  ScanLine,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import ArchitecturalModel, { type ViewMode } from './ArchitecturalModel'

type CameraState = 'preview' | 'loading' | 'live'
type GpsState = { status: 'ready' | 'locating' | 'locked' | 'unavailable'; accuracy?: number }
type Dialog = 'booking' | 'guide' | null

const compassDirections = ['NORTH', 'NORTH-EAST', 'EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST']

function BrandMark() {
  return (
    <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M4.5 30.5 18.8 7.5l6.4 10.4 3.2-5.2 7.1 17.8H4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m12.2 30.4 6.6-10.7 6.6 10.7M24.5 24.2l3.8-5.9 4.6 12.1" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function App() {
  const [mode, setMode] = useState<ViewMode>('wireframe')
  const [floors, setFloors] = useState(2)
  const [cameraState, setCameraState] = useState<CameraState>('preview')
  const [gps, setGps] = useState<GpsState>({ status: 'ready' })
  const [heading, setHeading] = useState<number | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [bookingSent, setBookingSent] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [toast, setToast] = useState('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const watchRef = useRef<number | null>(null)
  const audioRef = useRef<AudioContext | null>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      if (watchRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchRef.current)
      void audioRef.current?.close()
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useLayoutEffect(() => {
    if (!dialog) return
    const previousFocus = document.activeElement as HTMLElement | null
    const modal = dialogRef.current
    const focusable = () => Array.from(modal?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled])') ?? [])
    focusable()[0]?.focus()
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDialog(null)
        setBookingSent(false)
      } else if (event.key === 'Tab') {
        const elements = focusable()
        const first = elements[0]
        const last = elements[elements.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [dialog])

  useEffect(() => {
    if (bookingSent) dialogRef.current?.querySelector<HTMLButtonElement>('.dialog-action')?.focus()
  }, [bookingSent])

  useEffect(() => {
    function handleOrientation(event: DeviceOrientationEvent) {
      const iosEvent = event as DeviceOrientationEvent & { webkitCompassHeading?: number }
      if (typeof iosEvent.webkitCompassHeading === 'number') {
        setHeading(Math.round(iosEvent.webkitCompassHeading) % 360)
      } else if (event.absolute && event.alpha !== null) {
        setHeading(Math.round((360 - event.alpha) % 360))
      }
    }
    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener)
    window.addEventListener('deviceorientation', handleOrientation)
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener)
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  function playTone(enabled = soundOn) {
    if (!enabled) return
    try {
      const audio = audioRef.current ?? new AudioContext()
      audioRef.current = audio
      if (audio.state === 'suspended') void audio.resume()
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(740, audio.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(520, audio.currentTime + 0.13)
      gain.gain.setValueAtTime(0.035, audio.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.15)
      oscillator.connect(gain)
      gain.connect(audio.destination)
      oscillator.start()
      oscillator.stop(audio.currentTime + 0.16)
    } catch {
      // The visual controls remain usable when the browser blocks audio.
    }
  }

  function connectGps() {
    if (!navigator.geolocation) {
      setGps({ status: 'unavailable' })
      setToast('Location is not available in this browser.')
      return
    }
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    setGps({ status: 'locating' })
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => setGps({ status: 'locked', accuracy: Math.max(1, Math.round(position.coords.accuracy)) }),
      () => {
        setGps({ status: 'unavailable' })
        setToast('Location unavailable. Check permissions and try again.')
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )
  }

  async function toggleCamera() {
    if (cameraState === 'live') {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setCameraState('preview')
      playTone()
      return
    }
    if (cameraState === 'loading') return
    if (!navigator.mediaDevices?.getUserMedia) {
      setToast('Live camera requires a supported browser and HTTPS.')
      return
    }

    setCameraState('loading')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }
      setCameraState('live')
      playTone()
      if (gps.status === 'ready') connectGps()
    } catch {
      setCameraState('preview')
      setToast('Camera unavailable. Check permissions or continue in preview.')
    }
  }

  async function enableHeading() {
    const orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
    if (orientation?.requestPermission) {
      try {
        const permission = await orientation.requestPermission()
        if (permission !== 'granted') setToast('Compass access was not granted.')
      } catch {
        setToast('Compass access is unavailable on this device.')
      }
    } else if (heading === null) {
      setToast('Compass heading is not available on this device.')
    }
  }

  function selectMode(nextMode: ViewMode) {
    setMode(nextMode)
    playTone()
  }

  async function downloadPlan() {
    setDownloading(true)
    try {
      const { downloadFloorPlan } = await import('./floorPlan')
      downloadFloorPlan()
      playTone()
      setToast('Your illustrative floor plan is ready.')
    } catch {
      setToast('Could not create the floor plan. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  function saveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    try {
      localStorage.setItem('apex-heights-visit-request', JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        date: form.get('date'),
        interest: form.get('interest'),
        property: 'The Horizon Villa, Plot #14',
      }))
      setBookingSent(true)
      playTone()
    } catch {
      setToast('Could not save your request on this device.')
    }
  }

  function closeDialog() {
    setDialog(null)
    setBookingSent(false)
  }

  const gpsLabel = {
    ready: 'GPS READY',
    locating: 'LOCATING',
    locked: 'GPS LOCKED',
    unavailable: 'GPS UNAVAILABLE',
  }[gps.status]
  const gpsDetail = {
    ready: 'TAP TO CONNECT',
    locating: 'FINDING SIGNAL',
    locked: `±${gps.accuracy ?? 0}M ACCURACY`,
    unavailable: 'TAP TO RETRY',
  }[gps.status]
  const displayHeading = heading ?? 45
  const compassDirection = compassDirections[Math.round(displayHeading / 45) % 8]
  const compassCaption = heading === null && cameraState === 'live' ? 'HEADING UNAVAILABLE' : `FACING ${compassDirection}`

  return (
    <main className="app-shell">
      <div className="camera-background" aria-hidden="true">
        <div className="plot-image" />
        <video ref={videoRef} className={`live-video ${cameraState === 'live' ? 'is-active' : ''}`} autoPlay playsInline muted />
        <div className="camera-shade" />
        <div className="camera-grain" />
      </div>

      <header className="topbar">
        <div className="brand" aria-label="Apex Heights, Plot 14">
          <div className="brand-mark"><BrandMark /></div>
          <div className="brand-name">
            <strong>APEX HEIGHTS</strong>
            <span>PLOT #14 <i /> <em>AR EXPERIENCE</em></span>
          </div>
        </div>

        <div className="header-actions">
          <button className={`gps-badge gps-${gps.status}`} onClick={connectGps} type="button" aria-label={`${gpsLabel}, ${gpsDetail}. Tap to connect location.`}>
            <span className="gps-icon"><LocateFixed size={15} strokeWidth={1.7} /></span>
            <span className="gps-copy"><strong><i />{gpsLabel}</strong><small>{gpsDetail}</small></span>
          </button>
          <button className="icon-button sound-button" onClick={() => { const next = !soundOn; setSoundOn(next); playTone(next) }} type="button" aria-label={soundOn ? 'Mute sound' : 'Turn on sound'} title={soundOn ? 'Mute sound' : 'Turn on sound'}>
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button className="icon-button help-button" onClick={() => setDialog('guide')} type="button" aria-label="Open experience guide" title="Experience guide">
            <CircleHelp size={18} />
          </button>
        </div>
      </header>

      <section className="ar-stage" aria-label="Architectural preview">
        <div className="stage-index"><span className="index-dot" /> {cameraState === 'live' ? 'LIVE CAMERA VIEW' : 'INTERACTIVE PLOT PREVIEW'} <span className="index-divider" /> APEX HEIGHTS / PLOT 14</div>

        <button className="compass" onClick={enableHeading} type="button" aria-label="Compass heading. Tap to enable compass if available.">
          <div className="compass-ruler" aria-hidden="true">
            <span>N</span><i /><i /><i /><b>NE</b><i /><i /><i /><span>E</span>
          </div>
          <div className="compass-reading">
            <Navigation size={11} fill="currentColor" />
            <span>{compassCaption}</span>
            {(heading !== null || cameraState !== 'live') && <strong>{displayHeading}°</strong>}
            {heading === null && cameraState !== 'live' && <small>DEMO</small>}
          </div>
        </button>

        <div className="model-wrap">
          <div className="model-glow" />
          <ArchitecturalModel floors={floors} mode={mode} />
          <div className="reticle" aria-hidden="true"><span /><i /><b /></div>
          <div className="model-corner model-corner-left" aria-hidden="true" />
          <div className="model-corner model-corner-right" aria-hidden="true" />
        </div>

        <div className="stage-bottom">
          <button className="camera-button" onClick={toggleCamera} type="button" disabled={cameraState === 'loading'}>
            <span className="camera-button-icon">{cameraState === 'loading' ? <LoaderCircle size={17} className="spin" /> : <Camera size={17} />}</span>
            <span className="camera-button-copy"><strong>{cameraState === 'live' ? 'Exit live view' : 'Start live camera'}</strong><small>{cameraState === 'live' ? 'Return to preview' : 'See it on your plot'}</small></span>
            <ArrowUpRight className="camera-arrow" size={15} />
          </button>
          <div className="rotate-hint"><MoveHorizontal size={17} /><span>DRAG TO ROTATE</span><span className="rotate-hint-desktop"> THE MODEL</span></div>
        </div>
      </section>

      <aside className="property-card" aria-label="Property details and controls">
        <div className="sheet-handle" />
        <div className="property-eyebrow">
          <span><i /> THE FUTURE IS HERE</span>
          <span className="plot-number">PLOT 14 <b>/</b> APEX HEIGHTS</span>
        </div>
        <div className="property-heading">
          <div>
            <h1>The Horizon Villa</h1>
            <p>4 Bed Villa <span /> 3,200 sq ft</p>
          </div>
          <div className="property-price"><strong>$1,250,000</strong><span>EST. PRICE</span></div>
        </div>

        <div className="card-divider" />

        <div className="control-label"><span>VISUALIZATION</span><span>CHOOSE YOUR VIEW</span></div>
        <div className="view-switch" role="group" aria-label="Visualization mode">
          <button className={mode === 'wireframe' ? 'active' : ''} onClick={() => selectMode('wireframe')} type="button" aria-pressed={mode === 'wireframe'}>
            <Grid2X2 size={15} /> <span>Wireframe</span>
          </button>
          <button className={mode === 'render' ? 'active' : ''} onClick={() => selectMode('render')} type="button" aria-pressed={mode === 'render'}>
            <Box size={16} /> <span>Full 3D render</span>
          </button>
        </div>

        <div className="range-header"><label htmlFor="floors">FLOOR LEVELS</label><strong>0{floors} <span>/ 03</span></strong></div>
        <input
          id="floors"
          className="floor-slider"
          type="range"
          min="1"
          max="3"
          step="1"
          value={floors}
          aria-valuetext={`${floors} ${floors === 1 ? 'floor' : 'floors'}`}
          onChange={(event) => setFloors(Number(event.target.value))}
          style={{ '--slider-fill': `${((floors - 1) / 2) * 100}%` } as CSSProperties}
        />
        <div className="range-ticks" aria-hidden="true"><span>1 FLOOR</span><span>2 FLOORS</span><span>3 FLOORS</span></div>

        <button className="primary-cta" onClick={() => { setDialog('booking'); playTone() }} type="button">
          <span><CalendarDays size={17} /> Book a site visit</span><ArrowUpRight size={18} />
        </button>
        <button className="secondary-cta" onClick={downloadPlan} type="button" disabled={downloading}>
          <span>{downloading ? <LoaderCircle size={17} className="spin" /> : <Download size={17} />} Download floor plan</span><span className="pdf-label">PDF</span>
        </button>
        <p className="card-footnote"><ScanLine size={12} /> Concept visualization. Not to scale.</p>
      </aside>

      {toast && <div className="toast" role="status">{toast}</div>}

      {dialog && (
        <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog() }}>
          <section ref={dialogRef} className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="dialog-topline"><span>APEX HEIGHTS <b>/</b> PLOT 14</span><button className="dialog-close" type="button" onClick={closeDialog} aria-label="Close dialog"><X size={19} /></button></div>
            {dialog === 'guide' ? (
              <>
                <p className="dialog-kicker">YOUR PROPERTY, REIMAGINED</p>
                <h2 id="dialog-title">A new way to see home.</h2>
                <p className="dialog-intro">From the sign to the site, explore what could be here in just a few steps.</p>
                <div className="guide-steps">
                  <div><span>01</span><p><strong>Scan and open</strong><small>Scan the sign's QR code to open this experience in your browser.</small></p></div>
                  <div><span>02</span><p><strong>Turn on your camera</strong><small>Allow camera and location access to see the preview over your surroundings.</small></p></div>
                  <div><span>03</span><p><strong>Explore the design</strong><small>Drag to rotate, change the view, and adjust the number of floors.</small></p></div>
                  <div><span>04</span><p><strong>Take the next step</strong><small>Save a visit request or download the illustrative floor plan.</small></p></div>
                </div>
                <p className="demo-notice"><strong>About this demo</strong> The model is a visual overlay, not ground-anchored AR. GPS shows your device's reported accuracy and does not position the model. Camera and location require permission and HTTPS.</p>
                <button className="dialog-action" type="button" onClick={closeDialog}>Start exploring <ArrowRight size={17} /></button>
              </>
            ) : bookingSent ? (
              <div className="booking-success">
                <div className="success-icon"><Check size={23} /></div>
                <p className="dialog-kicker">REQUEST SAVED</p>
                <h2 id="dialog-title">Your next chapter starts here.</h2>
                <p className="dialog-intro">Your request has been saved on this device. This is a demo, so it has not been sent to an agent.</p>
                <button className="dialog-action" type="button" onClick={closeDialog}>Back to the view <ArrowRight size={17} /></button>
              </div>
            ) : (
              <>
                <p className="dialog-kicker">LET'S MAKE IT REAL</p>
                <h2 id="dialog-title">See it for yourself.</h2>
                <p className="dialog-intro">Tell us a little about your plans for The Horizon Villa.</p>
                <form className="booking-form" onSubmit={saveBooking}>
                  <label>Full name<input name="name" placeholder="Your name" autoComplete="name" required /></label>
                  <label>Email address<input name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></label>
                  <div className="form-row">
                    <label>Preferred date<input name="date" type="date" min={new Date().toISOString().slice(0, 10)} required /></label>
                    <label>I'm interested in<select name="interest" defaultValue="Site visit"><option>Site visit</option><option>Talking to an agent</option></select></label>
                  </div>
                  <p className="form-disclaimer">Demo only: your request is saved on this device and is not sent to an agent.</p>
                  <button className="dialog-action" type="submit">Save my request <ArrowRight size={17} /></button>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default App