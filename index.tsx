
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Encryption Helper (Simple Base64 for Local Storage Obfuscation as requested) ---
const encryptKey = (key: string) => btoa(key);
const decryptKey = (encoded: string) => atob(encoded);

// --- Configuration ---
const getGenAI = () => {
  const savedKey = localStorage.getItem('suno_pro_api_key');
  const apiKey = savedKey ? decryptKey(savedKey) : process.env.API_KEY;
  return new GoogleGenAI({ apiKey: apiKey as string });
};

// --- API Key Management Popup Component ---
const ApiKeyManagerPopup = ({ onOpenApp }: { onOpenApp: () => void }) => {
  const [keyInput, setKeyInput] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'PARTIAL_SUCCESS' | 'ERROR'>('IDLE');
  const [caps, setCaps] = useState({
      text: 'IDLE',
      image: 'IDLE',
      pro: 'IDLE'
  });
  const [savedKeyExists, setSavedKeyExists] = useState(false);

  useEffect(() => {
    const key = localStorage.getItem('suno_pro_api_key');
    if (key) setSavedKeyExists(true);
  }, []);

  const testConnection = async (targetKey: string) => {
    setStatus('TESTING');
    setCaps({ text: 'CHECKING', image: 'CHECKING', pro: 'CHECKING' });
    
    try {
      const tempAi = new GoogleGenAI({ apiKey: targetKey });
      
      // Define checks for 3 core models
      const checkText = tempAi.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'hi',
      }).then(() => 'SUCCESS').catch(() => 'ERROR');

      const checkImage = tempAi.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: 'a dot',
      }).then(() => 'SUCCESS').catch(() => 'ERROR');
      
      const checkPro = tempAi.models.generateContent({
          model: 'gemini-3-pro-image-preview',
          contents: 'a dot',
      }).then(() => 'SUCCESS').catch(() => 'ERROR');

      // Execute in parallel
      const [textRes, imageRes, proRes] = await Promise.all([checkText, checkImage, checkPro]);
      
      setCaps({ text: textRes as any, image: imageRes as any, pro: proRes as any });

      if (textRes === 'SUCCESS') {
          // At least text works, save key
          localStorage.setItem('suno_pro_api_key', encryptKey(targetKey));
          setSavedKeyExists(true);
          
          if (imageRes === 'SUCCESS' && proRes === 'SUCCESS') {
              setStatus('SUCCESS');
              setTimeout(() => onOpenApp(), 1200);
          } else {
              setStatus('PARTIAL_SUCCESS');
          }
      } else {
          setStatus('ERROR');
      }
    } catch (e) {
      console.error(e);
      setStatus('ERROR');
      setCaps({ text: 'ERROR', image: 'ERROR', pro: 'ERROR' });
    }
  };

  const handleDelete = () => {
    localStorage.removeItem('suno_pro_api_key');
    setSavedKeyExists(false);
    setKeyInput('');
    setStatus('IDLE');
    setCaps({ text: 'IDLE', image: 'IDLE', pro: 'IDLE' });
  };

  const StatusRow = ({ label, status }: { label: string, status: string }) => (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#374151', borderRadius: '8px', marginBottom: '8px', border: '1px solid #4b5563' }}>
          <span style={{ fontSize: '13px', color: '#e5e7eb', fontWeight: '500' }}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {status === 'CHECKING' && <span className="material-symbols-outlined" style={{ fontSize: '18px', animation: 'spin 1s linear infinite' }}>sync</span>}
              {status === 'SUCCESS' && <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>check_circle</span>}
              {status === 'ERROR' && <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#ef4444' }}>cancel</span>}
              {status === 'IDLE' && <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#6b7280' }}>radio_button_unchecked</span>}
              
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: status === 'SUCCESS' ? '#10b981' : (status === 'ERROR' ? '#ef4444' : '#9ca3af') }}>
                  {status === 'CHECKING' ? '확인 중...' : (status === 'SUCCESS' ? '활성화됨' : (status === 'ERROR' ? '권한 없음' : '대기'))}
              </span>
          </div>
      </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        backgroundColor: '#1f2937', padding: '40px', borderRadius: '24px',
        width: '500px', border: '1px solid #374151', textAlign: 'center',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔐</div>
        <h2 style={{ color: 'white', marginBottom: '10px' }}>API Key Management</h2>
        <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '25px' }}>
          Gemini API 키를 입력하세요. 핵심 기능에 대한 접근 권한을 자동으로 테스트합니다.
        </p>

        {savedKeyExists && status === 'IDLE' ? (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid #10b981' }}>
            <p style={{ color: '#10b981', margin: 0, fontWeight: 'bold' }}>✅ API 키가 저장되어 있습니다.</p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={onOpenApp} style={{ flex: 1, padding: '12px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>앱 시작하기</button>
              <button onClick={handleDelete} style={{ padding: '12px', backgroundColor: '#374151', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', cursor: 'pointer' }}>삭제</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter your Gemini API Key"
              disabled={status === 'TESTING'}
              style={{ padding: '15px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '10px' }}
            />
            
            {(status === 'TESTING' || status === 'SUCCESS' || status === 'PARTIAL_SUCCESS' || status === 'ERROR') && (
                <div style={{ marginTop: '5px', marginBottom: '5px' }}>
                    <StatusRow label="기본 텍스트/추론 (Text & Reasoning)" status={caps.text} />
                    <StatusRow label="일반 이미지 생성 (Image Gen)" status={caps.image} />
                    <StatusRow label="Pro 고해상도 이미지 (Pro Image)" status={caps.pro} />
                </div>
            )}

            <button
              onClick={() => testConnection(keyInput)}
              disabled={status === 'TESTING' || !keyInput}
              style={{
                padding: '15px', backgroundColor: status === 'SUCCESS' ? '#10b981' : (status === 'PARTIAL_SUCCESS' ? '#f59e0b' : '#e11d48'),
                color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer',
                opacity: status === 'TESTING' ? 0.7 : 1
              }}
            >
              {status === 'TESTING' ? '기능 테스트 중...' : 
               status === 'SUCCESS' ? '모든 기능 연결 성공!' : 
               status === 'PARTIAL_SUCCESS' ? '일부 기능 제한됨 (앱 시작)' : 
               '연결 및 저장'}
            </button>
            
            {status === 'PARTIAL_SUCCESS' && (
                <button onClick={onOpenApp} style={{ padding: '12px', backgroundColor: '#374151', color: 'white', border: '1px solid #6b7280', borderRadius: '8px', cursor: 'pointer' }}>
                    제한된 기능으로 시작하기
                </button>
            )}

            {status === 'ERROR' && <p style={{ color: '#ef4444', fontSize: '12px' }}>API 키가 유효하지 않거나 연결에 실패했습니다.</p>}
          </div>
        )}
        <p style={{ marginTop: '20px', fontSize: '11px', color: '#6b7280' }}>
          * 저장된 키는 브라우저의 LocalStorage에 암호화된 상태로 보관됩니다.
        </p>
      </div>
    </div>
  );
};

// --- Responsive CSS Injection ---
const responsiveGlobalStyles = `
  @keyframes spin { 100% { transform: rotate(360deg); } }
  body { overflow-x: hidden; width: 100%; position: relative; }
  #root { width: 100%; overflow-x: hidden; }
  
  /* Layout Transitions */
  .studio-container { display: flex; width: 100%; height: 100%; }
  .studio-main-content { flex: 1; overflow-y: auto; padding: 30px; background-color: #1f2937; }
  
  @media (max-width: 768px) {
    .studio-container { flex-direction: column !important; }
    .sidebar-nav { 
      width: 100% !important; 
      height: auto !important; 
      flex-direction: row !important; 
      padding: 0 !important; 
      border-right: none !important; 
      border-top: 1px solid #374151 !important;
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      z-index: 1000 !important;
      justify-content: space-around !important;
      background-color: #111827 !important;
    }
    .sidebar-nav button { padding: 8px 0 !important; gap: 2px !important; }
    .sidebar-nav span:last-child { font-size: 9px !important; }
    .sidebar-divider { display: none !important; }
    .studio-main-content { padding: 15px !important; padding-bottom: 80px !important; }
    
    /* Responsive Grids */
    .responsive-grid-2 { grid-template-columns: 1fr !important; }
    .responsive-grid-3 { grid-template-columns: 1fr !important; }
    .lyrics-view { grid-template-columns: 1fr !important; height: auto !important; }
    
    /* Dashboard */
    .dashboard-header { flex-direction: column !important; align-items: flex-start !important; gap: 15px !important; }
    .dashboard-projects { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important; }
    
    /* Header */
    .app-header { padding: 0 10px !important; }
    .header-logo span:last-child { display: none !important; }
    .header-actions { gap: 5px !important; }
    .header-actions button { padding: 6px 8px !important; font-size: 11px !important; }
  }
`;

// --- Types ---
type ViewState = 'DASHBOARD' | 'STUDIO';
type StudioTab = 'CONCEPT' | 'STRUCTURE' | 'LYRICS' | 'SOUND' | 'ART' | 'EXPORT';

interface ThemePack {
  title: string;
  topic: string;
  style: string;
}

interface ReferenceSuggestion {
  song: string;
  artist: string;
}

interface InstrumentPreset {
  name: string;
  instruments: string[];
}

interface Project {
  id: string;
  title: string;
  genre: string;
  subGenre: string;
  mood: string;
  styleDescription: string;
  bpm: number;
  key: string;
  createdAt: number;
  
  // Reference Song
  referenceSongTitle?: string;
  referenceArtist?: string;

  // Generated Content
  concept?: string;
  generatedTitles: string[];
  structure: SongBlock[];
  lyrics: string;
  excludedThemes?: string;
  sunoPrompt: string;
  coverImage?: string;
  compositionAdvice?: string; // AI Music Composition Suggestions
  
  // Lyric Ideas Persistence
  lyricVariations?: {title: string, lyrics: string, rationale: string}[];
  selectedLyricVariationIndex?: number | null;

  // Settings
  instruments: string[];
  vocalType: string;
  djName?: string;
  introStyle?: string;
}

interface SongBlock {
  id: string;
  type: string;
  description: string;
  duration: number;
}

interface SamplePrompt {
    label: string;
    text: string;
}

// --- Global Interface for AI Studio ---
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}

// --- Constants ---
const GENRES = [
  { label: 'K-Pop', subgenres: ['Girl Crush', 'Cheongryang (Refreshing)', 'High Teen', 'Dark Concept', 'Cyberpunk', 'Easy Listening'] },
  { label: 'Ballad', subgenres: ['Traditional Ballad', 'Rock Ballad', 'R&B Ballad', 'Indie Ballad'] },
  { label: 'Hip-Hop', subgenres: ['Trap', 'Boom Bap', 'Singing Rap', 'K-HipHop', 'Jazz Rap'] },
  { label: 'R&B', subgenres: ['K-R&B', 'Soul', 'Groovy', 'Neo Soul'] },
  { label: 'Fusion', subgenres: ['Fusion Gugak', 'Joseon Pop', 'Pansori Hip-Hop', 'Folk Rock Fusion'] },
  { label: 'Trot', subgenres: ['Dance Trot', 'Traditional Trot', 'EDM Trot', 'Semi-Trot'] },
  { label: 'Band/Rock', subgenres: ['Modern Rock', 'Punk Rock', 'Synth Rock', 'Acoustic'] },
  { label: 'Indie/Folk', subgenres: ['Acoustic Folk', 'City Pop', 'Lo-fi'] },
  { label: 'OST', subgenres: ['Drama OST', 'Cinematic', 'Musical Style'] },
  { label: 'Custom', subgenres: [] }
];

const MOODS = [
  'Energetic & Powerful (신나는)',
  'Sentimental & Sad (아련/슬픔)',
  'Refreshing & Cool (청량한)',
  'Dreamy & Mystical (몽환적인)',
  'Hip & Swag (힙한)',
  'Lovely & Sweet (사랑스러운)',
  'Dark & Intense (강렬한)',
  'Retro & Funky (레트로)',
  'Chill & Relaxed (편안한)',
  'Traditional & Han (한국적/한)'
];

const INSTRUMENTS = [
  'Piano', 'Soft Piano', 'Synthesizer', 'Synth Pads', 'Organ',
  'Guitar', 'Electric Guitar', 'Acoustic Guitar', 'Bass', 'Slap Bass', '808 Bass',
  'Drums', 'Trap Beats', 'Electronic Drums', 'Percussion',
  'Strings', 'Violin', 'Cello', 'Orchestra',
  'Brass', 'Trumpet', 'Saxophone',
  'Gayageum (Zither)', 'Haegeum (Fiddle)', 'Janggu (Drum)', 'Kwaenggwari (Gong)', 'Daeguem (Flute)', 'Piri',
  'Backing Vocals', 'Whistle', 'FX'
];

const INTRO_STYLES = [
  { id: '1', label: '속삭임 (Whisper/Narration)', desc: '아이돌 곡 시그니처. 멤버의 속삭임이나 나레이션으로 시작해 팬들의 이목 집중.', sunoTags: '[Whisper Intro], [Narration], [Member Name Shoutout]' },
  { id: '2', label: '강렬한 비트 (Impact)', desc: '시작하자마자 강한 베이스와 킥으로 때려박는 스타일. 걸크러쉬/다크 컨셉.', sunoTags: '[Heavy 808 Bass], [Explosive Intro], [Trap Beat Start]' },
  { id: '3', label: '감성 피아노 (Emotional)', desc: '잔잔한 피아노 선율로 시작. 발라드나 드라마 OST 도입부 느낌.', sunoTags: '[Melodic Piano Intro], [Soft Atmosphere], [Emotional Start]' },
  { id: '4', label: '국악기 독주 (Fusion)', desc: '가야금이나 해금의 독주로 시작하여 한국적인 미를 강조.', sunoTags: '[Gayageum Solo], [Haegeum Melody], [Traditional Korean Intro]' },
  { id: '5', label: '카운트다운 (Count-in)', desc: 'One, Two, Three! 힘찬 카운트와 함께 밴드 사운드 혹은 댄스 브레이크 시작.', sunoTags: '[Spoken Count-in], [Energetic Start], [Band Hit]' },
  { id: '6', label: '레트로 신스 (City Pop)', desc: '80년대 느낌의 신디사이저와 드럼 머신. 몽환적이고 세련된 도입부.', sunoTags: '[Retro Synth Intro], [City Pop Vibe], [80s Drum Machine]' },
  { id: '7', label: '아카펠라/코러스 (Harmony)', desc: '악기 없이 보컬 화음으로 시작하여 목소리에 집중.', sunoTags: '[Acapella Intro], [Vocal Harmony], [Choir Start]' }
];

const ART_STYLES = [
  'Digital Art', 'Photorealistic', '3D Render', 'Oil Painting', 'Anime/Manga',
  'Watercolor', 'Cyberpunk', 'Steampunk', 'Synthwave', 'Vaporwave',
  'Pop Art', 'Minimalist', 'Abstract', 'Surrealism', 'Ukiyo-e',
  'Sketch/Pencil', 'Gothic', 'Renaissance', 'Pixel Art', 'Graffiti/Street Art'
];

const IMAGE_SIZE_PRESETS = [
    { id: 0, label: 'Square (1:1)', ratio: '1:1', desc: 'Instagram Feed, Profile' },
    { id: 1, label: 'Landscape (16:9)', ratio: '16:9', desc: 'YouTube, Web Banner' },
    { id: 2, label: 'Portrait (9:16)', ratio: '9:16', desc: 'Stories, Reels, TikTok' },
    { id: 3, label: 'Classic TV (4:3)', ratio: '4:3', desc: 'Retro, Tablet View' },
    { id: 4, label: 'Classic Photo (3:4)', ratio: '3:4', desc: 'Standard Print' },
    { id: 5, label: 'Social Post (4:5)', ratio: '3:4', desc: 'IG Portrait (Crop optimized)' },
    { id: 6, label: 'Wide Link (1.9:1)', ratio: '16:9', desc: 'FB/Twitter Link Preview' },
    { id: 7, label: 'Cinematic (21:9)', ratio: '16:9', desc: 'Ultra Widescreen Movie' },
    { id: 8, label: 'Tall Banner (1:2)', ratio: '9:16', desc: 'Vertical Display Ad' },
    { id: 9, label: 'Circular (1:1)', ratio: '1:1', desc: 'Sticker, Badge Style' }
];

// Helper to map UI ratio to API supported ratio
const getApiAspectRatio = (ratio: string) => {
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    if (validRatios.includes(ratio)) return ratio;
    // Fallback mapping
    if (ratio === '4:5') return '3:4'; // Closest vertical
    if (ratio === '1.91:1') return '16:9'; // Closest landscape
    if (ratio === '21:9') return '16:9'; // Closest landscape
    if (ratio === '1:2') return '9:16'; // Closest vertical
    return '1:1';
};

const FONT_OPTIONS = [
    { label: 'Inter (Modern Standard)', value: "'Inter', sans-serif" },
    { label: 'Roboto (Clean)', value: "'Roboto', sans-serif" },
    { label: 'Open Sans (Neutral)', value: "'Open Sans', sans-serif" },
    { label: 'Montserrat (Geometric)', value: "'Montserrat', sans-serif" },
    { label: 'Poppins (Friendly)', value: "'Poppins', sans-serif" },
    { label: 'Lato (Stable)', value: "'Lato', sans-serif" },
    { label: 'Oswald (Tall & Bold)', value: "'Oswald', sans-serif" },
    { label: 'Anton (Impact)', value: "'Anton', sans-serif" },
    { label: 'Bebas Neue (Condensed)', value: "'Bebas Neue', cursive" },
    { label: 'Playfair Display (Elegant)', value: "'Playfair Display', serif" },
    { label: 'Merriweather (Readability)', value: "'Merriweather', serif" },
    { label: 'Abril Fatface (Big Serif)', value: "'Abril Fatface', cursive" },
    { label: 'Lobster (Retro Script)', value: "'Lobster', cursive" },
    { label: 'Pacifico (Fun Script)', value: "'Pacifico', cursive" },
    { label: 'Dancing Script (Handwritten)', value: "'Dancing Script', cursive" },
    { label: 'Permanent Marker (Marker)', value: "'Permanent Marker', cursive" }
];

const TEXT_EFFECT_OPTIONS = [
    { id: 'none', label: 'None (Clean)', style: {} },
    { id: 'shadow_soft', label: 'Soft Shadow', style: { textShadow: '2px 2px 4px rgba(0,0,0,0.5)' } },
    { id: 'shadow_hard', label: 'Hard Shadow', style: { textShadow: '3px 3px 0px rgba(0,0,0,0.8)' } },
    { id: 'outline_black', label: 'Outline (Black)', style: { WebkitTextStroke: '1px black', textShadow: '1px 1px 2px black' } },
    { id: 'outline_white', label: 'Outline (White)', style: { WebkitTextStroke: '1px white', color: '#000' } },
    { id: 'neon_pink', label: 'Neon Pink', style: { textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 20px #e11d48, 0 0 30px #e11d48, 0 0 40px #e11d48' } },
    { id: 'neon_blue', label: 'Neon Blue', style: { textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 20px #3b82f6, 0 0 30px #3b82f6, 0 0 40px #3b82f6' } },
    { id: 'glow_gold', label: 'Golden Glow', style: { textShadow: '0 0 10px #fbbf24, 0 0 20px #fbbf24' } },
    { id: 'retro_3d', label: 'Retro 3D', style: { textShadow: '2px 2px 0px #e11d48, 4px 4px 0px #3b82f6' } },
    { id: 'fire', label: 'Fire', style: { textShadow: '0 -1px 2px #fff, 2px -2px 5px #fbbf24, -2px -4px 10px #ef4444, 0 -8px 15px #ea580c' } },
    { id: 'ice', label: 'Ice', style: { textShadow: '0 0 2px #fff, 0 0 5px #bae6fd, 0 0 10px #0ea5e9' } },
    { id: 'cyberpunk', label: 'Cyberpunk', style: { textShadow: '2px 0px 0px #ef4444, -2px 0px 0px #3b82f6', fontStyle: 'italic' } },
    { id: 'heavy_metal', label: 'Heavy Metal', style: { textShadow: '0 1px 0 #ccc, 0 2px 0 #c9c9c9, 0 3px 0 #bbb, 0 4px 0 #b9b9b9, 0 5px 0 #aaa, 0 6px 1px rgba(0,0,0,.1), 0 0 5px rgba(0,0,0,.1), 0 1px 3px rgba(0,0,0,.3), 0 3px 5px rgba(0,0,0,.2), 0 5px 10px rgba(0,0,0,.25), 0 10px 10px rgba(0,0,0,.2), 0 20px 20px rgba(0,0,0,.15)' } },
    { id: 'vintage', label: 'Vintage Letterpress', style: { color: 'rgba(255,255,255,0.8)', textShadow: '1px 1px 1px rgba(0,0,0,0.8), -1px -1px 1px rgba(255,255,255,0.3)' } },
    { id: 'emboss', label: 'Embossed', style: { color: '#eee', textShadow: '-1px -1px 1px rgba(255,255,255,0.3), 1px 1px 1px rgba(0,0,0,0.5)' } },
    { id: 'mirror', label: 'Reflection', style: { textShadow: '0px 10px 5px rgba(255,255,255,0.3)' } },
    { id: 'elegant', label: 'Elegant Blur', style: { textShadow: '0 0 4px rgba(255,255,255,0.8)' } },
    { id: 'pop_art', label: 'Pop Art', style: { WebkitTextStroke: '2px black', textShadow: '4px 4px 0px #fbbf24' } },
    { id: 'hollow', label: 'Hollow', style: { WebkitTextStroke: '1px white', color: 'transparent' } },
    { id: 'glitch', label: 'Glitchy', style: { textShadow: '3px 0 #ff00ff, -3px 0 #00ffff' } }
];

const CHARACTER_SAMPLES = [
  'Idol Group on Stage', 'Solo Singer with Mic', 'Traditional Hanbok Dancer', 'Cyberpunk DJ',
  'Sentimental Pianist', 'Rainy Seoul Street', 'Neon Club Crowd', 'Fantasy Warrior',
  'School Uniform High Teen', 'Blooming Cherry Blossoms', 'Abstract Sound Waves', 'Retro Cassette Tape'
];

const DEFAULT_ARTISTS = ['DJ Seoul', 'MC Haneul', 'Luna'];

const GENRE_DEFAULTS: Record<string, string[]> = {
  'K-Pop': ['Synthesizer', 'Bass', 'Electronic Drums', 'Vocals', 'Backing Vocals', 'FX'],
  'Ballad': ['Piano', 'Strings', 'Acoustic Guitar', 'Bass', 'Drums'],
  'Hip-Hop': ['808 Bass', 'Trap Beats', 'Synthesizer', 'Piano'],
  'R&B': ['Electric Piano', 'Bass', 'Snap', 'Soft Synth', 'Electric Guitar'],
  'Fusion': ['Gayageum (Zither)', 'Haegeum (Fiddle)', 'Trap Beats', 'Synthesizer', 'Janggu (Drum)'],
  'Trot': ['Brass', 'Accordion', 'Electronic Drums', 'Synthesizer', 'Bass'],
  'Band/Rock': ['Electric Guitar', 'Bass', 'Drums', 'Synthesizer'],
  'Indie/Folk': ['Acoustic Guitar', 'Piano', 'Shaker', 'Bass'],
  'OST': ['Orchestra', 'Piano', 'Strings', 'Acoustic Guitar'],
  'Custom': ['Drums', 'Bass', 'Piano', 'Synthesizer']
};

const BLOCK_SAMPLES: Record<string, string[]> = {
  'Intro': [
    'Whisper Narration',
    'Explosive Dance Beat',
    'Emotional Piano Solo',
    'Gugak Melody (Gayageum)',
    'Counting (One, Two, Three!)'
  ],
  'Verse': [
    'Rhythmic Rap',
    'Melodic Singing (Low range)',
    'Storytelling',
    'Building Up',
    'Groovy Bass Line'
  ],
  'Chorus': [
    'Killing Part (Hook)',
    'High Note Explosion',
    'Addictive Repetition',
    'Group Harmony',
    'Drop (EDM Style)'
  ],
  'Bridge': [
    'Mood Change (Slow down)',
    'High Note Ad-lib',
    'Rap Break',
    'Minimal Instrument',
    'Build up to Final Chorus'
  ],
  'Drop': [
    'Dance Break (Choreography Focus)',
    'Heavy Bass Drop',
    'Synth Lead Solo',
    'Traditional Percussion Break'
  ],
  'Instrumental': [
    'Guitar Solo',
    'Haegeum Solo',
    'Piano Interlude',
    'Synth Solo'
  ],
  'Outro': [
    'Ending Fairy Pose (Fade out)',
    'High Note Finish',
    'Whisper Ending',
    'Abrupt Stop',
    'Instrumental Fade'
  ]
};

const DEFAULT_SAMPLE_PROMPTS = [
  {
    label: "✨ K-Pop Girl Crush",
    text: "[Intro: Heavy Bass], K-Pop Girl Crush, 130 BPM, Key F#m. Powerful 808 bass, trap beats, aggressive synth lead, confident female vocals, catchy hook, English rap verse. Blackpink style."
  },
  {
    label: "🌊 Refreshing Boy Group",
    text: "[Intro: Bright Synth], K-Pop Boy Group, 118 BPM, Key C. Cheongryang (Refreshing) vibe, funky guitar riff, slap bass, energetic drums, harmonization, high note ad-libs. Summer beach party vibe."
  },
  {
    label: "🇰🇷 Fusion Gugak Trap",
    text: "[Intro: Gayageum riff], Fusion Hip-hop, 95 BPM, Key Am. Traditional Korean instruments (Gayageum, Haegeum) mixed with heavy Trap beats. 808 bass, rap verses, Pansori style vocals in chorus. Unique and energetic."
  },
  {
    label: "🎤 Emotional OST Ballad",
    text: "[Intro: Soft Piano], K-Drama OST, 68 BPM, Key Eb. Emotional ballad, grand piano, orchestral strings, slow build-up, crying female vocals, climactic high note. Sad but beautiful."
  },
  {
    label: "🕺 Neo-Trot",
    text: "[Intro: Brass Hit], EDM Trot, 128 BPM, Key Am. Addictive melody, ppong-jak rhythm mixed with modern EDM beat. Brass section, synthesizer, energetic male vocals. Party atmosphere."
  }
];

const STRUCTURE_TEMPLATES = {
  'Standard K-Pop': [
      { type: 'Intro', description: 'Signature Sound & Member Narration', duration: 4 },
      { type: 'Verse', description: 'Verse 1 (Storytelling)', duration: 16 },
      { type: 'Verse', description: 'Pre-Chorus (Build-up)', duration: 8 },
      { type: 'Chorus', description: 'Main Hook (Killing Part)', duration: 16 },
      { type: 'Verse', description: 'Verse 2 (Rap Part)', duration: 16 },
      { type: 'Verse', description: 'Pre-Chorus', duration: 8 },
      { type: 'Chorus', description: 'Main Hook', duration: 16 },
      { type: 'Bridge', description: 'Emotional High Note & Slow down', duration: 8 },
      { type: 'Chorus', description: 'Final Chorus (Explosion)', duration: 16 },
      { type: 'Outro', description: 'Ending Pose Fade', duration: 4 }
  ],
  'Y2K Style (NewJeans Vibe)': [
      { type: 'Intro', description: 'Retro Synth & Beat', duration: 8 },
      { type: 'Chorus', description: 'Catchy Hook Intro', duration: 16 },
      { type: 'Verse', description: 'Groovy Vocal', duration: 16 },
      { type: 'Chorus', description: 'Main Hook', duration: 16 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Main Hook', duration: 16 },
      { type: 'Outro', description: 'Fade out with Ad-libs', duration: 8 }
  ],
  'Viral Hook Song (Short)': [
      { type: 'Intro', description: 'Impact Sound', duration: 4 },
      { type: 'Chorus', description: 'Viral Challenge Part', duration: 16 },
      { type: 'Verse', description: 'Short Rap', duration: 8 },
      { type: 'Chorus', description: 'Viral Challenge Part', duration: 16 },
      { type: 'Outro', description: 'Signature Sound', duration: 4 }
  ],
  'Emotional Ballad (OST)': [
      { type: 'Intro', description: 'Piano Solo', duration: 8 },
      { type: 'Verse', description: 'Calm Vocals', duration: 16 },
      { type: 'Chorus', description: 'Emotional Melody', duration: 16 },
      { type: 'Verse', description: 'Verse 2 (Strings Enter)', duration: 16 },
      { type: 'Chorus', description: 'Emotional Melody', duration: 16 },
      { type: 'Bridge', description: 'Orchestral Climax', duration: 8 },
      { type: 'Chorus', description: 'Final Chorus (Max Emotion)', duration: 16 },
      { type: 'Outro', description: 'Piano Fade out', duration: 8 }
  ],
  'Hip-Hop (Trap)': [
      { type: 'Intro', description: 'Beat Tag & Mumble', duration: 8 },
      { type: 'Chorus', description: 'Main Theme', duration: 16 },
      { type: 'Verse', description: 'Verse 1 (Tight Flow)', duration: 16 },
      { type: 'Chorus', description: 'Main Theme', duration: 16 },
      { type: 'Verse', description: 'Verse 2 (Different Flow)', duration: 16 },
      { type: 'Chorus', description: 'Main Theme', duration: 16 },
      { type: 'Outro', description: 'Fade out', duration: 8 }
  ],
  'Fusion Gugak (Joseon Pop)': [
      { type: 'Intro', description: 'Gayageum Riff', duration: 8 },
      { type: 'Verse', description: 'Pansori Style Vocals', duration: 16 },
      { type: 'Chorus', description: 'Modern Pop Hook', duration: 16 },
      { type: 'Instrumental', description: 'Traditional & Trap Drop', duration: 8 },
      { type: 'Verse', description: 'Rap Verse', duration: 16 },
      { type: 'Chorus', description: 'Main Hook', duration: 16 },
      { type: 'Outro', description: 'Kwaenggwari Ending', duration: 8 }
  ],
  'EDM Trot (Party)': [
      { type: 'Intro', description: 'Brass & Electronic Beat', duration: 8 },
      { type: 'Verse', description: 'Trot Melody', duration: 16 },
      { type: 'Chorus', description: 'Addictive Hook', duration: 16 },
      { type: 'Instrumental', description: 'Dance Break (Synthesizer)', duration: 16 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Addictive Hook', duration: 16 },
      { type: 'Outro', description: 'High Energy Finish', duration: 4 }
  ],
  'Rock Ballad (Band)': [
      { type: 'Intro', description: 'Electric Guitar Solo', duration: 8 },
      { type: 'Verse', description: 'Bass & Vocal', duration: 16 },
      { type: 'Chorus', description: 'Full Band Explosion', duration: 16 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Full Band', duration: 16 },
      { type: 'Instrumental', description: 'Guitar Solo', duration: 16 },
      { type: 'Chorus', description: 'Final Chorus', duration: 16 },
      { type: 'Outro', description: 'Band Finish', duration: 8 }
  ],
  'City Pop (Retro)': [
      { type: 'Intro', description: '80s Drum Fill & Synth', duration: 8 },
      { type: 'Verse', description: 'Dreamy Vocals', duration: 16 },
      { type: 'Chorus', description: 'Nostalgic Melody', duration: 16 },
      { type: 'Instrumental', description: 'Saxophone or Synth Solo', duration: 8 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Nostalgic Melody', duration: 16 },
      { type: 'Outro', description: 'Long Fade Out', duration: 16 }
  ],
  'Acoustic Indie': [
      { type: 'Intro', description: 'Guitar Arpeggio', duration: 8 },
      { type: 'Verse', description: 'Soft Whispering', duration: 16 },
      { type: 'Chorus', description: 'Folk Melody', duration: 16 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Bridge', description: 'Humming / Scat', duration: 8 },
      { type: 'Chorus', description: 'Folk Melody', duration: 16 },
      { type: 'Outro', description: 'Guitar Chord', duration: 4 }
  ],
  'High Teen (School Concept)': [
      { type: 'Intro', description: 'School Bell & Guitar', duration: 8 },
      { type: 'Verse', description: 'Cheerful Vocals', duration: 16 },
      { type: 'Chorus', description: 'Energetic Chorus', duration: 16 },
      { type: 'Verse', description: 'Rap (Playful)', duration: 16 },
      { type: 'Bridge', description: 'Cheerleading Chant', duration: 8 },
      { type: 'Chorus', description: 'Final Chorus', duration: 16 },
      { type: 'Outro', description: 'Laughing & Fade', duration: 4 }
  ],
  'Girl Crush (Strong)': [
      { type: 'Intro', description: 'English Narration & Bass', duration: 8 },
      { type: 'Verse', description: 'Low Tone Rap', duration: 16 },
      { type: 'Chorus', description: 'Drop (Minimal Vocals)', duration: 16 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Drop', duration: 16 },
      { type: 'Bridge', description: 'Vocal Build Up', duration: 8 },
      { type: 'Drop', description: 'Final Dance Break', duration: 16 },
      { type: 'Outro', description: 'Signature Pose', duration: 4 }
  ],
  'Boy Group (Performance)': [
      { type: 'Intro', description: 'Dark Sound & Breath', duration: 8 },
      { type: 'Verse', description: 'Intense Rap', duration: 16 },
      { type: 'Verse', description: 'Pre-Chorus (Melodic)', duration: 8 },
      { type: 'Chorus', description: 'Powerful Unison', duration: 16 },
      { type: 'Drop', description: 'Dance Break (Instrumental)', duration: 16 },
      { type: 'Bridge', description: 'High Note Ad-lib', duration: 8 },
      { type: 'Chorus', description: 'Final Chorus', duration: 16 },
      { type: 'Outro', description: 'Heavy Breathing', duration: 4 }
  ],
  'Summer Song (Cool)': [
      { type: 'Intro', description: 'Wave Sound & Tropical House', duration: 8 },
      { type: 'Verse', description: 'Fresh Vocals', duration: 16 },
      { type: 'Chorus', description: 'Cool & High Melody', duration: 16 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Cool & High Melody', duration: 16 },
      { type: 'Bridge', description: 'Slow down', duration: 8 },
      { type: 'Chorus', description: 'Final Chorus with Ad-libs', duration: 16 },
      { type: 'Outro', description: 'Yeah~!', duration: 4 }
  ],
  'Winter Song (Carol)': [
      { type: 'Intro', description: 'Sleigh Bells & Piano', duration: 8 },
      { type: 'Verse', description: 'Warm Vocals', duration: 16 },
      { type: 'Chorus', description: 'Carol Harmony', duration: 16 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Carol Harmony', duration: 16 },
      { type: 'Bridge', description: 'Jazz Piano Solo', duration: 8 },
      { type: 'Chorus', description: 'Final Chorus', duration: 16 },
      { type: 'Outro', description: 'Merry Christmas Whisper', duration: 4 }
  ],
  'R&B Groove': [
      { type: 'Intro', description: 'Electric Piano Chords', duration: 8 },
      { type: 'Verse', description: 'Groovy Vocals', duration: 16 },
      { type: 'Chorus', description: 'Falsetto Hook', duration: 16 },
      { type: 'Verse', description: 'Singing Rap', duration: 16 },
      { type: 'Chorus', description: 'Falsetto Hook', duration: 16 },
      { type: 'Instrumental', description: 'Bass Solo', duration: 8 },
      { type: 'Outro', description: 'Vocal Runs', duration: 8 }
  ],
  'Cyberpunk (Aespa Style)': [
      { type: 'Intro', description: 'Glitch Sound & Metallic Beat', duration: 8 },
      { type: 'Verse', description: 'Unique Flow', duration: 16 },
      { type: 'Chorus', description: 'Hyperpop Melody', duration: 16 },
      { type: 'Verse', description: 'Verse 2 (Tempo Change)', duration: 16 },
      { type: 'Chorus', description: 'Hyperpop Melody', duration: 16 },
      { type: 'Bridge', description: 'Distorted Bass', duration: 8 },
      { type: 'Chorus', description: 'Final Chorus', duration: 16 },
      { type: 'Outro', description: 'System Shutdown FX', duration: 4 }
  ],
  'Dreamy / Fairy': [
      { type: 'Intro', description: 'Wind Chimes & Pad', duration: 8 },
      { type: 'Verse', description: 'Soft Vocals', duration: 16 },
      { type: 'Chorus', description: 'Magical Melody', duration: 16 },
      { type: 'Instrumental', description: 'Synth Pluck Solo', duration: 8 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Magical Melody', duration: 16 },
      { type: 'Outro', description: 'Disappearing Sound', duration: 8 }
  ],
  'Introvert / Lofi': [
      { type: 'Intro', description: 'Vinyl Crackle & Rain', duration: 8 },
      { type: 'Verse', description: 'Mumbled Singing', duration: 16 },
      { type: 'Chorus', description: 'Simple Repetitive Melody', duration: 16 },
      { type: 'Verse', description: 'Verse 2', duration: 16 },
      { type: 'Chorus', description: 'Simple Repetitive Melody', duration: 16 },
      { type: 'Outro', description: 'Tape Stop', duration: 4 }
  ],
  'Festival / EDM': [
      { type: 'Intro', description: 'Build Up Riser', duration: 16 },
      { type: 'Drop', description: 'Big Room Drop (Jump!)', duration: 16 },
      { type: 'Verse', description: 'Hype Vocals', duration: 16 },
      { type: 'Chorus', description: 'Sing-along Anthem', duration: 16 },
      { type: 'Drop', description: 'Second Drop', duration: 16 },
      { type: 'Outro', description: 'Fireworks Sound', duration: 8 }
  ],
  'Musical Style': [
      { type: 'Intro', description: 'Orchestra Overture', duration: 8 },
      { type: 'Verse', description: 'Dialogue Style Singing', duration: 16 },
      { type: 'Chorus', description: 'Grand Ensemble', duration: 16 },
      { type: 'Bridge', description: 'Dramatic Key Change', duration: 8 },
      { type: 'Chorus', description: 'Grand Ensemble (Fortissimo)', duration: 16 },
      { type: 'Outro', description: 'Final Chord Hold', duration: 8 }
  ],
  'Jazz Bar (Solo)': [
      { type: 'Intro', description: 'Double Bass & Brush Drum', duration: 8 },
      { type: 'Verse', description: 'Soulful Vocals', duration: 16 },
      { type: 'Chorus', description: 'Swing Rhythm', duration: 16 },
      { type: 'Instrumental', description: 'Piano Improvisation', duration: 16 },
      { type: 'Chorus', description: 'Swing Rhythm', duration: 16 },
      { type: 'Outro', description: 'Scat Singing', duration: 8 }
  ],
  'Acoustic Cafe': [
      { type: 'Intro', description: 'Guitar Strumming', duration: 4 },
      { type: 'Verse', description: 'Sweet Vocals', duration: 16 },
      { type: 'Chorus', description: 'Comforting Melody', duration: 16 },
      { type: 'Verse', description: 'Whistling', duration: 16 },
      { type: 'Chorus', description: 'Comforting Melody', duration: 16 },
      { type: 'Outro', description: 'Coffee Pouring Sound', duration: 4 }
  ],
  'Latin-Kpop (Fusion)': [
      { type: 'Intro', description: 'Spanish Guitar Riff', duration: 8 },
      { type: 'Verse', description: 'Seductive K-Pop Vocals', duration: 16 },
      { type: 'Chorus', description: 'Reggaeton Beat Drop', duration: 16 },
      { type: 'Verse', description: 'Rap with Latin Flow', duration: 16 },
      { type: 'Chorus', description: 'Reggaeton Beat Drop', duration: 16 },
      { type: 'Outro', description: 'Adios', duration: 4 }
  ],
  'Grand Epic (Final)': [
      { type: 'Intro', description: 'Marching Drums & Choir', duration: 16 },
      { type: 'Verse', description: 'Low & Serious', duration: 16 },
      { type: 'Chorus', description: 'Epic Harmony', duration: 16 },
      { type: 'Bridge', description: 'Silence then Explosion', duration: 8 },
      { type: 'Chorus', description: 'Maximum Volume & Choir', duration: 16 },
      { type: 'Outro', description: 'Orchestral Hit', duration: 4 }
  ]
};

const GENRE_PRESETS: Record<string, { label: string, bpm: number, key: string, instruments?: string[] }[]> = {
  'K-Pop': [
    { label: '💖 Girl Crush (Blackpink Style)', bpm: 130, key: 'F#m', instruments: ['Synthesizer', '808 Bass', 'Trap Beats', 'Brass'] },
    { label: '🌊 Refreshing (Seventeen Style)', bpm: 118, key: 'C', instruments: ['Electric Guitar', 'Synthesizer', 'Slap Bass', 'Vocals'] },
    { label: '🏫 High Teen (NewJeans Style)', bpm: 105, key: 'G', instruments: ['Synth Pads', 'Drum Break', 'Bass', 'Soft Vocals'] },
    { label: '😈 Dark Concept (Stray Kids Style)', bpm: 140, key: 'Em', instruments: ['Distorted Synth', 'Heavy Drums', 'Screams', 'Bass'] },
    { label: '🧚 Dreamy (Oh My Girl Style)', bpm: 120, key: 'Eb', instruments: ['Strings', 'Wind Chimes', 'Piano', 'Synth'] }
  ],
  'Ballad': [
    { label: '🎹 Traditional Ballad', bpm: 68, key: 'C', instruments: ['Grand Piano', 'Strings', 'Bass', 'Drums'] },
    { label: '🎸 Rock Ballad', bpm: 75, key: 'D', instruments: ['Electric Guitar', 'Drums', 'Bass', 'Piano'] },
    { label: '🍂 Indie Acoustic', bpm: 80, key: 'G', instruments: ['Acoustic Guitar', 'Shaker', 'Melodica'] }
  ],
  'Hip-Hop': [
    { label: '⛓️ Trap (Show Me The Money)', bpm: 140, key: 'C#m', instruments: ['808 Bass', 'Hi-hat Rolls', 'Synth'] },
    { label: '🎤 Singing Rap (Melodic)', bpm: 95, key: 'Am', instruments: ['Piano', 'Lofi Drums', 'Bass'] },
    { label: '🎷 Jazz Rap', bpm: 90, key: 'Bb', instruments: ['Saxophone', 'Double Bass', 'Piano', 'Brush Drums'] }
  ],
  'Fusion': [
    { label: '🇰🇷 Fusion Gugak (Leenalchi Style)', bpm: 130, key: 'Am', instruments: ['Bass', 'Drums', 'Pansori Vocals'] },
    { label: '🏮 Joseon Pop', bpm: 100, key: 'Dm', instruments: ['Gayageum', 'Synth', 'Trap Beats'] },
    { label: '🏯 Historical Drama Action', bpm: 145, key: 'Cm', instruments: ['Taiko Drums', 'Haegeum', 'Orchestra'] }
  ],
  'Trot': [
    { label: '💃 Dance Trot', bpm: 130, key: 'Am', instruments: ['Brass', 'Synthesizer', 'Electronic Drums'] },
    { label: '😭 Traditional Trot', bpm: 85, key: 'Dm', instruments: ['Accordion', 'Guitar', 'Violin'] },
    { label: '⚡ EDM Trot', bpm: 135, key: 'Gm', instruments: ['Heavy Kick', 'Saw Synth', 'Brass'] }
  ],
  'R&B': [
    { label: '🌙 K-R&B (Dean/Crush Style)', bpm: 90, key: 'Fm', instruments: ['Electric Piano', 'Synth Bass', 'Finger Snap'] },
    { label: '🍷 Neo Soul', bpm: 80, key: 'Eb', instruments: ['Organ', 'Bass', 'Clean Guitar'] }
  ],
  'Band/Rock': [
    { label: '🎸 Modern Rock (Day6 Style)', bpm: 120, key: 'E', instruments: ['Electric Guitar', 'Synth', 'Bass', 'Drums'] },
    { label: '🛹 Punk Rock', bpm: 160, key: 'A', instruments: ['Distorted Guitar', 'Fast Drums', 'Bass'] }
  ],
  'Indie/Folk': [
    { label: '🌃 City Pop', bpm: 110, key: 'F', instruments: ['Retro Synth', 'Funky Guitar', 'Bass'] },
    { label: '☕ Cafe Acoustic', bpm: 80, key: 'D', instruments: ['Acoustic Guitar', 'Piano'] }
  ],
  'OST': [
    { label: '🎬 Drama Emotional', bpm: 65, key: 'Bb', instruments: ['Piano', 'Orchestra'] },
    { label: '⚔️ Epic Action', bpm: 120, key: 'Gm', instruments: ['Percussion', 'Brass', 'Strings'] }
  ],
  'Custom': [
    { label: 'Basic', bpm: 100, key: 'C', instruments: ['Piano', 'Drums', 'Bass'] }
  ]
};

// --- Helper Components ---
const Icon = ({ name }: { name: string }) => <span className="material-symbols-outlined" style={{ fontSize: '1.2em', verticalAlign: 'bottom' }}>{name}</span>;

const NavButton = ({ active, onClick, icon, label, legibilityMode }: any) => (
  <button 
    onClick={onClick}
    style={{ 
      background: 'none', border: 'none', 
      color: active 
        ? (legibilityMode ? '#FDE047' : '#e11d48') 
        : (legibilityMode ? '#E5E7EB' : '#6b7280'), 
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
      cursor: 'pointer', width: '100%', padding: '10px 0'
    }}
  >
    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{icon}</span>
    <span style={{ fontSize: '11px', fontWeight: active ? 'bold' : 'normal' }}>{label}</span>
  </button>
);

const ManualModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)', zIndex: 5000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
        <div style={{
            backgroundColor: '#1f2937', width: '800px', maxWidth: '90vw', maxHeight: '85vh',
            borderRadius: '16px', border: '1px solid #374151', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '20px' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>menu_book</span>
                    Suno Studio Pro V1.0 사용 매뉴얼
                </h2>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div style={{ padding: '30px', overflowY: 'auto', color: '#e5e7eb', lineHeight: '1.7' }}>
                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#e11d48', borderBottom: '1px solid #374151', paddingBottom: '8px', marginBottom: '15px' }}>1. 프로젝트 시작 (Dashboard)</h3>
                    <p>새로운 음악 프로젝트를 생성하고 관리하는 공간입니다.</p>
                    <ul style={{ paddingLeft: '20px', color: '#d1d5db', fontSize: '14px' }}>
                        <li><strong>New Project:</strong> 장르(K-Pop, Ballad 등), 무드, 제목을 설정하여 프로젝트를 생성합니다.</li>
                        <li><strong>프로젝트 관리:</strong> 클릭하여 편집하거나, JSON 파일로 내보내기/삭제가 가능합니다.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#fbbf24', borderBottom: '1px solid #374151', paddingBottom: '8px', marginBottom: '15px' }}>2. 기획 (Concept Tab)</h3>
                    <p>곡의 주제와 방향성을 설정합니다.</p>
                    <ul style={{ paddingLeft: '20px', color: '#d1d5db', fontSize: '14px' }}>
                        <li><strong>AI 아이디어 팩:</strong> 장르에 어울리는 제목, 주제, 스타일을 AI가 추천해줍니다.</li>
                        <li><strong>참고할 노래 (Reference):</strong> 유튜브나 기존 곡의 정보를 입력하면, 해당 곡의 바이브를 분석하여 가사와 사운드 생성에 반영합니다.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#3b82f6', borderBottom: '1px solid #374151', paddingBottom: '8px', marginBottom: '15px' }}>3. 구조 설계 (Structure Tab)</h3>
                    <p>곡의 흐름(Intro, Verse, Chorus 등)을 블록 단위로 설계합니다.</p>
                    <ul style={{ paddingLeft: '20px', color: '#d1d5db', fontSize: '14px' }}>
                        <li><strong>블록 편집:</strong> 각 파트의 설명(Description)을 수정하거나 순서를 변경할 수 있습니다.</li>
                        <li><strong>인트로 스타일:</strong> 곡의 시작 분위기를 결정합니다 (예: 속삭임, 강렬한 비트 등).</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#10b981', borderBottom: '1px solid #374151', paddingBottom: '8px', marginBottom: '15px' }}>4. 가사 작업 (Lyrics Tab)</h3>
                    <p>AI를 활용해 곡의 구조에 맞는 가사를 생성합니다.</p>
                    <ul style={{ paddingLeft: '20px', color: '#d1d5db', fontSize: '14px' }}>
                        <li><strong>Dance Optimization Mode:</strong> 댄서들이 박자를 세기 쉽도록 8-count 구조에 맞춰 가사를 생성합니다.</li>
                        <li><strong>AI 길이 자동 조절:</strong> 설정된 목표 시간(Duration)에 맞춰 가사의 분량을 자동으로 조절합니다.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#8b5cf6', borderBottom: '1px solid #374151', paddingBottom: '8px', marginBottom: '15px' }}>5. 사운드 디자인 (Sound Tab)</h3>
                    <p>Suno.ai에서 사용할 프롬프트를 생성합니다.</p>
                    <ul style={{ paddingLeft: '20px', color: '#d1d5db', fontSize: '14px' }}>
                        <li><strong>장르별 프리셋:</strong> 선택한 장르에 최적화된 BPM, Key, 악기 구성을 불러옵니다.</li>
                        <li><strong>Strict Dance Mode:</strong> 춤추기 좋은 정박(Steady Beat)을 유지하도록 프롬프트를 강화합니다.</li>
                        <li><strong>BPM 업로드:</strong> 오디오 파일을 업로드하여 BPM을 분석하고 프로젝트에 적용할 수 있습니다.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: '30px' }}>
                    <h3 style={{ color: '#ec4899', borderBottom: '1px solid #374151', paddingBottom: '8px', marginBottom: '15px' }}>6. 아트 & 배포 (Art & Export)</h3>
                    <ul style={{ paddingLeft: '20px', color: '#d1d5db', fontSize: '14px' }}>
                        <li><strong>Art:</strong> 곡의 분위기에 어울리는 앨범 커버를 생성합니다.</li>
                        <li><strong>Export:</strong> 작업한 프로젝트를 JSON으로 백업하거나, 메타데이터 초안(제목, 가사, 태그 등)을 자동 생성하여 복사할 수 있습니다.</li>
                    </ul>
                </section>
            </div>
            <div style={{ padding: '20px', borderTop: '1px solid #374151', textAlign: 'center' }}>
                <button onClick={onClose} style={{ padding: '10px 30px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                    닫기
                </button>
            </div>
        </div>
    </div>
  );
};

// --- TAB: Concept ---
const ConceptTab = ({ project, onUpdate, legibilityMode }: any) => {
  const [loading, setLoading] = useState(false);
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [themePacks, setThemePacks] = useState<ThemePack[]>([]);
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [referenceSuggestions, setReferenceSuggestions] = useState<ReferenceSuggestion[]>([]);
  const [ideaKeywords, setIdeaKeywords] = useState('');

  const generateThemePacks = async () => {
    setLoadingPacks(true);
    try {
        const keywordContext = ideaKeywords.trim() 
            ? `\n        User Keywords/Themes: "${ideaKeywords}".\n        Please prioritize these keywords in the generated concepts.`
            : '';

        const prompt = `Generate 12 unique and creative "Song Idea Packs" for a ${project.genre} (${project.subGenre}) song with a ${project.mood} mood.${keywordContext}
        Each pack must include:
        1. A catchy English Title (with Korean translation in parentheses).
        2. A Topic: A 1-2 sentence description in Korean of the story or scenario.
        3. A Style: A 1-2 sentence description in Korean of the musical production, era, and vibe.

        Strict Requirements:
        - Return ONLY a JSON array of objects.
        - Each object should have keys: "title", "topic", "style".
        - Do not include markdown code blocks or any other text.
        - Use Korean for "topic" and "style".
        - Titles should be formatted like "Title (제목)".
        `;

        const response: any = await getGenAI().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            topic: { type: Type.STRING },
                            style: { type: Type.STRING }
                        },
                        required: ['title', 'topic', 'style']
                    }
                }
            }
        });

        const data = JSON.parse(response.text || '[]');
        setThemePacks(data);
    } catch (e) {
        console.error(e);
        alert('아이디어 팩 생성 중 오류가 발생했습니다.');
    }
    setLoadingPacks(false);
  };

  const generateTitleSuggestions = async () => {
      if (!project.concept) {
          alert('제목을 추천받으려면 먼저 [주제]를 입력해주세요.');
          return;
      }
      setLoadingTitles(true);
      try {
          const prompt = `Suggest 5 catchy and creative song titles for a ${project.genre} song.
          Topic/Theme: ${project.concept}
          Mood: ${project.mood}
          Requirements:
          - Return ONLY a JSON array of 5 strings.
          - Each string should be in the format: "English Title (한글 제목)".
          - Do not include any other text or markdown.`;

          const response: any = await getGenAI().models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                  }
              }
          });

          const data = JSON.parse(response.text || '[]');
          setTitleSuggestions(data);
      } catch (e) {
          console.error(e);
          alert('제목 추천 중 오류가 발생했습니다.');
      }
      setLoadingTitles(false);
  };

  const generateReferenceSuggestions = async () => {
      setLoadingReferences(true);
      try {
          const prompt = `Suggest 5 popular and characteristic songs that represent the ${project.genre} (${project.subGenre}) genre with a ${project.mood} mood.
          Return ONLY a JSON array of objects.
          Each object should have keys: "song" and "artist".
          Do not include markdown code blocks.`;

          const response: any = await getGenAI().models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              song: { type: Type.STRING },
                              artist: { type: Type.STRING }
                          },
                          required: ['song', 'artist']
                      }
                  }
              }
          });

          const data = JSON.parse(response.text || '[]');
          setReferenceSuggestions(data);
      } catch (e) {
          console.error(e);
          alert('참고 곡 추천 중 오류가 발생했습니다.');
      }
      setLoadingReferences(false);
  };

  const applyThemePack = (pack: ThemePack) => {
      // Clean title from parentheses for the main project title if needed
      const englishTitle = pack.title.match(/^([^(]+)/)?.[1]?.trim() || pack.title;
      onUpdate({
          title: englishTitle,
          concept: pack.topic,
          styleDescription: pack.style
      });
  };

  const applySuggestedTitle = (fullTitle: string) => {
      const englishTitle = fullTitle.match(/^([^(]+)/)?.[1]?.trim() || fullTitle;
      onUpdate({ title: englishTitle });
  };

  const applyReference = (song: string, artist: string) => {
      onUpdate({ referenceSongTitle: song, referenceArtist: artist });
  };

  const searchYouTube = () => {
      const query = `${project.referenceSongTitle || ''} ${project.referenceArtist || ''}`.trim() || `${project.genre} ${project.mood} music`;
      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, '_blank');
  };

  const primaryTextColor = legibilityMode ? '#FFFFFF' : 'white';
  const labelColor = legibilityMode ? '#F9FAF8' : '#d1d5db';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <h2 style={{ borderBottom: '1px solid #374151', paddingBottom: '15px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: primaryTextColor, fontWeight: legibilityMode ? 'bold' : 'normal' }}>
        <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>auto_awesome</span>
        🎵 프로젝트 기획 (Concept)
      </h2>

      {/* AI Theme Pack Suggestion Section */}
      <div style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#111827', borderRadius: '12px', border: '1px solid #e11d48' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ flex: '1 1 300px', marginRight: '0' }}>
                <h3 style={{ margin: 0, fontSize: '18px', color: '#e11d48', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                    <span className="material-symbols-outlined">bolt</span> AI 아이디어 팩 (장르별 추천)
                </h3>
                <p style={{ margin: '5px 0 10px 0', fontSize: '13px', color: legibilityMode ? '#E5E7EB' : '#9ca3af' }}>장르와 무드에 맞는 제목, 주제, 스타일을 한 번에 추천받으세요.</p>
                <input 
                    type="text"
                    value={ideaKeywords}
                    onChange={(e) => setIdeaKeywords(e.target.value)}
                    placeholder="✨ 키워드 입력 (선택사항: 예 - 여름, 이별, 커피, 여행...)"
                    style={{ 
                        width: '100%', padding: '10px', backgroundColor: '#1f2937', 
                        border: '1px solid #4b5563', borderRadius: '6px', 
                        color: 'white', fontSize: '13px', boxSizing: 'border-box'
                    }}
                />
              </div>
              <button 
                onClick={generateThemePacks}
                disabled={loadingPacks}
                style={{ 
                    padding: '10px 20px', backgroundColor: '#e11d48', color: 'white', border: 'none', 
                    borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' 
                }}
              >
                {loadingPacks ? 'AI 추천 생성 중...' : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>magic_button</span> 추천 팩 생성</>}
              </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '15px', maxHeight: '400px', overflowY: 'auto', padding: '5px' }}>
              {themePacks.length > 0 ? themePacks.map((pack, i) => (
                  <div 
                    key={i}
                    onClick={() => applyThemePack(pack)}
                    style={{ 
                        padding: '15px', backgroundColor: '#1f2937', borderRadius: '10px', cursor: 'pointer', 
                        border: '1px solid #374151', transition: 'all 0.2s', textAlign: 'left'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#e11d48'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#374151'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#fbbf24', marginBottom: '8px' }}>{pack.title}</div>
                      <div style={{ fontSize: '12px', color: '#d1d5db', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          <strong>주제:</strong> {pack.topic}
                      </div>
                      <div style={{ fontSize: '11px', color: legibilityMode ? '#E5E7EB' : '#9ca3af', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          <strong>스타일:</strong> {pack.style}
                      </div>
                  </div>
              )) : (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#4b5563' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '10px' }}>lightbulb</span>
                      <p>버튼을 눌러 AI가 추천하는 아이디어 팩을 확인해보세요.</p>
                  </div>
              )}
          </div>
      </div>
      
      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div>
            <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', color: labelColor, marginBottom: '10px', fontWeight: 'bold' }}>곡의 주제 및 아이디어 (Topic)</label>
                <textarea 
                value={project.concept || ''}
                onChange={e => onUpdate({ concept: e.target.value })}
                placeholder="예: 해변가 파티에서 만난 첫사랑, 뜨거운 살사 댄스..."
                style={{ width: '100%', height: '120px', padding: '15px', borderRadius: '8px', backgroundColor: '#111827', border: '1px solid #374151', color: 'white', resize: 'none', boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', color: '#e11d48', fontWeight: 'bold', marginBottom: '10px' }}>스타일 (Style) - 사운드 생성 가이드</label>
                <textarea 
                value={project.styleDescription || ''}
                onChange={e => onUpdate({ styleDescription: e.target.value })}
                placeholder="예: 1990년대 스타일의 올드스쿨 느낌, 슬프지만 춤추기 좋은, 여성 보컬의 애절함..."
                style={{ width: '100%', height: '120px', padding: '15px', borderRadius: '8px', backgroundColor: '#111827', border: '1px solid #e11d48', color: 'white', resize: 'none', boxSizing: 'border-box' }}
                />
            </div>
          </div>

          <div>
             <div style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ color: labelColor, fontWeight: 'bold' }}>현재 제목 (Title)</label>
                    <button 
                        onClick={generateTitleSuggestions}
                        disabled={loadingTitles}
                        style={{ 
                            fontSize: '11px', padding: '4px 10px', backgroundColor: '#3b82f6', color: 'white', 
                            border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' 
                        }}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>magic_button</span>
                        {loadingTitles ? '추천 중...' : 'AI 제목 추천 (5가지)'}
                    </button>
                </div>
                <input 
                    type="text" 
                    value={project.title}
                    onChange={e => onUpdate({ title: e.target.value })}
                    style={{ width: '100%', padding: '15px', borderRadius: '8px', backgroundColor: '#111827', border: '1px solid #374151', color: 'white', fontSize: '18px', fontWeight: 'bold', boxSizing: 'border-box' }}
                />
                
                {/* Title Suggestions Chips */}
                {titleSuggestions.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {titleSuggestions.map((st, i) => (
                            <button 
                                key={i}
                                onClick={() => applySuggestedTitle(st)}
                                style={{ 
                                    padding: '6px 12px', backgroundColor: '#1f2937', border: '1px solid #3b82f6', 
                                    color: '#93c5fd', borderRadius: '15px', fontSize: '12px', cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#1f2937'}
                            >
                                {st}
                            </button>
                        ))}
                    </div>
                )}
             </div>

             {/* Reference Song Section */}
             <div style={{ padding: '20px', backgroundColor: '#1f2937', borderRadius: '12px', border: '1px solid #374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                    <label style={{ color: '#818cf8', fontWeight: 'bold' }}>참고할 노래 (Reference)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={generateReferenceSuggestions}
                            disabled={loadingReferences}
                            style={{ fontSize: '11px', backgroundColor: '#818cf8', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>auto_awesome</span>
                            {loadingReferences ? '추천 중...' : 'AI 추천'}
                        </button>
                        <button 
                            onClick={searchYouTube}
                            style={{ fontSize: '11px', backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>smart_display</span>
                            YouTube
                        </button>
                    </div>
                </div>

                {/* Reference Suggestions Chips */}
                {referenceSuggestions.length > 0 && (
                    <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {referenceSuggestions.map((ref, idx) => (
                            <div 
                                key={idx}
                                onClick={() => applyReference(ref.song, ref.artist)}
                                style={{ 
                                    fontSize: '11px', padding: '8px 12px', backgroundColor: '#111827', 
                                    border: '1px solid #4b5563', borderRadius: '6px', cursor: 'pointer',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#818cf8'; e.currentTarget.style.backgroundColor = 'rgba(129, 140, 248, 0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.backgroundColor = '#111827'; }}
                            >
                                <span style={{ color: legibilityMode ? '#FFFFFF' : '#d1d5db' }}><strong>{ref.song}</strong> - {ref.artist}</span>
                                <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#818cf8' }}>add_circle</span>
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input 
                        type="text" 
                        value={project.referenceSongTitle || ''}
                        onChange={e => onUpdate({ referenceSongTitle: e.target.value })}
                        placeholder="노래 제목 (예: Hype Boy)"
                        style={{ width: '100%', padding: '12px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '8px', boxSizing: 'border-box' }}
                    />
                    <input 
                        type="text" 
                        value={project.referenceArtist || ''}
                        onChange={e => onUpdate({ referenceArtist: e.target.value })}
                        placeholder="가수 이름 (예: NewJeans)"
                        style={{ width: '100%', padding: '12px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '8px', boxSizing: 'border-box' }}
                    />
                </div>
                <p style={{ fontSize: '12px', color: legibilityMode ? '#E5E7EB' : '#9ca3af', marginTop: '12px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', marginTop: '2px' }}>info</span>
                    참고 곡 정보를 입력하면 AI가 비슷한 바이브의 가사와 사운드 프롬프트를 생성해줍니다.
                </p>
             </div>
          </div>
      </div>
    </div>
  );
};

// --- TAB: Structure ---
const StructureTab = ({ project, onUpdate, legibilityMode }: any) => {
  const [selectedTemplate, setSelectedTemplate] = useState('Custom');

  const moveBlock = (index: number, direction: -1 | 1) => {
     const newStructure = [...project.structure];
     if (index + direction < 0 || index + direction >= newStructure.length) return;
     const temp = newStructure[index];
     newStructure[index] = newStructure[index + direction];
     newStructure[index + direction] = temp;
     onUpdate({ structure: newStructure });
  };

  const addBlock = (type: string) => {
     const newBlock = { 
         id: Date.now().toString(), 
         type, 
         description: BLOCK_SAMPLES[type]?.[0] || '...',
         duration: type === 'Intro' || type === 'Outro' ? 4 : 8 
     };
     onUpdate({ structure: [...project.structure, newBlock] });
  };

  const removeBlock = (index: number) => {
      const newStructure = [...project.structure];
      newStructure.splice(index, 1);
      onUpdate({ structure: newStructure });
  };

  const updateBlockDescription = (index: number, desc: string) => {
      const newStructure = project.structure.map((block: SongBlock, i: number) => 
        i === index ? { ...block, description: desc } : block
      );
      onUpdate({ structure: newStructure });
  };

  const applyTemplate = (templateName: string) => {
    setSelectedTemplate(templateName);
    if (templateName === 'Custom') return;

    // @ts-ignore
    const template = STRUCTURE_TEMPLATES[templateName];
    if (template) {
        const newStructure = template.map((block: any, idx: number) => ({
            ...block,
            id: Date.now().toString() + idx
        }));
        onUpdate({ structure: newStructure });
    }
  };

  const titleColor = legibilityMode ? '#FFFFFF' : 'white';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ borderBottom: '1px solid #374151', paddingBottom: '15px', marginBottom: '20px', color: titleColor, fontWeight: legibilityMode ? 'bold' : 'normal' }}>🎹 곡 구조 설계 (Structure Editor)</h2>
        
        <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <span style={{ color: legibilityMode ? '#FFFFFF' : '#d1d5db', fontSize: '14px' }}>구조 템플릿 불러오기:</span>
            <select 
                value={selectedTemplate} 
                onChange={(e) => applyTemplate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#111827', color: 'white', border: '1px solid #4b5563' }}
            >
                {Object.keys(STRUCTURE_TEMPLATES).map(t => (
                    <option key={t} value={t}>{t}</option>
                ))}
            </select>
            <span style={{ fontSize: '12px', color: legibilityMode ? '#E5E7EB' : '#9ca3af' }}>* 선택 시 현재 구조가 변경됩니다.</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' }}>
            {['Intro', 'Verse', 'Chorus', 'Bridge', 'Drop', 'Instrumental', 'Outro'].map(type => (
                <button 
                    key={type} 
                    onClick={() => addBlock(type)}
                    style={{ padding: '8px 16px', backgroundColor: '#374151', border: 'none', borderRadius: '20px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    + {type}
                </button>
            ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '20px', alignItems: 'flex-start' }}>
            {project.structure.map((block: SongBlock, i: number) => (
                <div key={block.id} style={{ 
                    minWidth: '220px', 
                    flex: block.duration,
                    backgroundColor: block.type === 'Chorus' ? '#e11d48' : block.type === 'Verse' ? '#2563eb' : '#4b5563',
                    borderRadius: '8px', padding: '15px', position: 'relative',
                    transition: 'all 0.2s',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ fontWeight: 'bold', color: '#FFFFFF' }}>{block.type}</span>
                        <button onClick={() => removeBlock(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>×</button>
                    </div>
                    
                    {/* Sample Selection */}
                    <select 
                       value={block.description} 
                       onChange={(e) => updateBlockDescription(i, e.target.value)}
                       style={{ width: '100%', marginBottom: '5px', backgroundColor: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', fontSize: '12px', padding: '4px', borderRadius: '4px' }}
                    >
                        <option value={block.description}>{block.description} (Custom)</option>
                        {BLOCK_SAMPLES[block.type]?.map((sample, idx) => (
                            <option key={idx} value={sample}>{sample}</option>
                        ))}
                    </select>

                    <input 
                        type="text" 
                        value={block.description}
                        onChange={(e) => updateBlockDescription(i, e.target.value)}
                        placeholder="직접 입력..."
                        style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', fontSize: '12px', padding: '4px', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', gap: '5px' }}>
                         <button onClick={() => moveBlock(i, -1)} style={{ fontSize: '10px', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>◀</button>
                         <button onClick={() => moveBlock(i, 1)} style={{ fontSize: '10px', background: 'rgba(0,0,0,0.3)', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>▶</button>
                    </div>
                </div>
            ))}
        </div>

        {/* Intro Style Selector */}
        <div style={{ marginTop: '30px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h3 style={{ fontSize: '18px', color: '#e11d48', margin: 0, fontWeight: legibilityMode ? 'bold' : 'normal' }}>🎧 인트로 스타일 설정 (Intro Vibe)</h3>
                {project.introStyle && (
                    <button 
                        onClick={() => onUpdate({ introStyle: undefined })}
                        style={{ 
                            fontSize: '12px', padding: '6px 12px', backgroundColor: '#374151', 
                            border: '1px solid #4b5563', color: legibilityMode ? '#FFFFFF' : '#d1d5db', borderRadius: '6px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}
                        title="선택된 인트로 스타일을 해제합니다"
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                        선택 해제 (Clear)
                    </button>
                )}
            </div>
            <p style={{ fontSize: '13px', color: legibilityMode ? '#E5E7EB' : '#9ca3af', marginBottom: '20px' }}>
                원하는 인트로 분위기를 선택하면 <strong>가사(Lyrics)</strong>와 <strong>사운드(Prompt)</strong> 생성에 자동으로 반영됩니다.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                {INTRO_STYLES.map(style => {
                    const isSelected = project.introStyle === style.id;
                    return (
                        <div 
                            key={style.id}
                            onClick={() => onUpdate({ introStyle: style.id })}
                            style={{ 
                                padding: '15px', 
                                backgroundColor: isSelected ? 'rgba(225, 29, 72, 0.15)' : '#1f2937', 
                                border: isSelected ? '1px solid #e11d48' : '1px solid #374151',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative'
                            }}
                        >
                            {isSelected && <div style={{ position: 'absolute', top: '10px', right: '10px', color: '#e11d48' }}>✔</div>}
                            <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px', color: isSelected ? '#fbbf24' : 'white' }}>
                                {style.label}
                            </div>
                            <div style={{ fontSize: '12px', color: legibilityMode ? '#E5E7EB' : '#9ca3af', lineHeight: '1.4' }}>
                                {style.desc}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* TIP Section */}
        <div className="responsive-grid-2" style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
             <div style={{ padding: '20px', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', color: '#fbbf24' }}>💡 구조 설계 팁 (Structure Tips)</h3>
                <ul style={{ fontSize: '13px', color: legibilityMode ? '#FFFFFF' : '#d1d5db', paddingLeft: '20px', lineHeight: '1.6' }}>
                    <li><strong>3분 이상 곡 만들기:</strong> [Intro] - [Verse] - [Chorus] - [Verse] - [Chorus] - [Bridge] - [Chorus] - [Outro] 구조를 추천합니다.</li>
                    <li><strong>빌드업:</strong> Chorus 전에 Bridge를 배치하면 감정을 고조시킬 수 있습니다.</li>
                    <li><strong>K-Pop 스타일:</strong> 인트로에 'Whisper Narration'을 추가하여 트렌디함을 살려보세요.</li>
                </ul>
             </div>

            <div style={{ padding: '20px', backgroundColor: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', color: legibilityMode ? '#FFFFFF' : 'white' }}>🎧 DJ/Producer Intro/Outro 설정</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: legibilityMode ? '#FFFFFF' : 'inherit' }}>
                        <input type="checkbox" checked={project.structure[0]?.type === 'Intro' && project.structure[0]?.description.includes('DJ')} 
                               onChange={(e) => {
                                   if (e.target.checked) {
                                       if (project.structure[0].type !== 'Intro') {
                                           const newStructure = [{ id: Date.now().toString(), type: 'Intro', description: 'DJ Friendly Intro (Percussion only)', duration: 4 }, ...project.structure];
                                           onUpdate({ structure: newStructure });
                                       } else {
                                            const newStructure = [...project.structure];
                                            newStructure[0] = { ...newStructure[0], description: 'DJ Friendly Intro (Percussion only)' };
                                            onUpdate({ structure: newStructure });
                                       }
                                   }
                               }}
                        /> 
                        DJ Friendly Intro (Percussion Only)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: legibilityMode ? '#FFFFFF' : 'inherit' }}>
                        <input type="checkbox" checked={project.structure[project.structure.length-1]?.type === 'Outro' && project.structure[project.structure.length-1]?.description.includes('DJ')} 
                                onChange={(e) => {
                                   if (e.target.checked) {
                                       // Logic to ensure outro exists
                                       const last = project.structure[project.structure.length-1];
                                       if (last.type !== 'Outro') {
                                            const newStructure = [...project.structure, { id: Date.now().toString(), type: 'Outro', description: 'DJ Friendly Outro (Beat loop)', duration: 4 }];
                                            onUpdate({ structure: newStructure });
                                       } else {
                                            const newStructure = [...project.structure];
                                            newStructure[newStructure.length-1] = { ...newStructure[newStructure.length-1], description: 'DJ Friendly Outro (Beat loop)' };
                                            onUpdate({ structure: newStructure });
                                       }
                                   }
                               }}
                        /> 
                        DJ Friendly Outro (Mixable Loop)
                    </label>
                    
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#1f2937', borderRadius: '6px' }}>
                        <label style={{ display: 'block', fontSize: '12px', color: legibilityMode ? '#FFFFFF' : '#9ca3af', marginBottom: '5px' }}>DJ/Producer Name (가사에 포함)</label>
                        <input 
                            type="text" 
                            value={project.djName || ''}
                            onChange={(e) => onUpdate({ djName: e.target.value })}
                            placeholder="예: DJ Seoul (입력시 Intro에 시그니처 반영)"
                            style={{ width: '100%', padding: '8px', backgroundColor: '#374151', border: 'none', color: 'white', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                        <div style={{ marginTop: '8px' }}>
                           <button 
                               onClick={() => onUpdate({ djName: 'Brave Brothers' })}
                               style={{ 
                                   background: 'transparent', border: '1px solid #4b5563', borderRadius: '12px', 
                                   color: legibilityMode ? '#FFFFFF' : '#9ca3af', padding: '4px 10px', fontSize: '11px', cursor: 'pointer',
                                   transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '5px'
                               }}
                               onMouseEnter={(e) => {e.currentTarget.style.borderColor = '#e11d48'; e.currentTarget.style.color = '#e11d48';}}
                               onMouseLeave={(e) => {e.currentTarget.style.borderColor = '#4b5563'; e.currentTarget.style.color = legibilityMode ? '#FFFFFF' : '#9ca3af';}}
                           >
                               <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>smart_toy</span>
                               Apply "Brave Brothers" Style
                           </button>
                        </div>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0 0' }}>* 이름을 입력하면 가사 생성 시 Intro 또는 Outro 중 한 곳에만 "JYP!" 처럼 시그니처 사운드가 추가됩니다.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

// --- TAB: Lyrics ---
const LyricsTab = ({ project, onUpdate, legibilityMode }: any) => {
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('Korean & English Mix');
  const [lyricLength, setLyricLength] = useState('Standard (~3:00)');
  const [isDanceMode, setIsDanceMode] = useState(false);
  const [autoAdjustLength, setAutoAdjustLength] = useState(false);
  
  // Use persistent project data for variations instead of local state
  const variations = project.lyricVariations || [];
  const selectedVariationIndex = project.selectedLyricVariationIndex ?? null;

  const [loadingVariations, setLoadingVariations] = useState(false);
  const [focusedCardIndex, setFocusedCardIndex] = useState<number | null>(null);

  const generateLyrics = async () => {
    setLoading(true);
    try {
        const structureText = project.structure.map((s: SongBlock) => `[${s.type}]: ${s.description}`).join('\n');
        
        let introInstruction = '';
        if (project.introStyle) {
            const style = INTRO_STYLES.find(s => s.id === project.introStyle);
            if (style) {
                introInstruction = `
                SPECIAL INTRO INSTRUCTION:
                The user has selected the intro vibe: "${style.label}".
                ${style.desc}
                Please indicate this vibe in the [Intro] section of the lyrics (e.g., [Intro: Whisper Narration] or [Intro: Gayageum Solo]).
                `;
            }
        }

        let danceModeInstruction = '';
        if (isDanceMode) {
            danceModeInstruction = `
            
            *** STRICT DANCE LYRIC MODE ACTIVATED ***
            OBJECTIVE: Generate lyrics strictly optimized for choreography and dancers (8-count structure).

            1. SYLLABLE COUNT & DISPLAY:
               - You MUST display the syllable count at the end of EVERY line in parentheses. 
                 Format: "Lyric text here (count)"
               - DANCE PRESET: Target consistent 8 syllables per line for choreo synchronization.
               - Maintain consistent syllable counts within each 4-line block.

            2. 8-COUNT STRUCTURE (VISUAL):
               - Group lyrics strictly into 4-line blocks (representing one 8-count phrase).
               - Add an empty line between every 4-line block.
               - This is critical for dancers to count the beat.

            3. CONTENT & RHYTHM:
               - Use [Strict Rhythm] (Jeong-bak).
               - Add [Breath] or pause implied at the end of lines.
               - Avoid complex sentences or rubato.
               - Simple, clear words that hit the beat.
            `;
        }

        const referenceInfo = project.referenceSongTitle
            ? `Reference Vibe/Flow: Make the lyrics and rhythm reminiscent of the song "${project.referenceSongTitle}" by ${project.referenceArtist || 'Unknown Artist'}. Capture its emotional tone and rhythmic delivery.`
            : '';

        const prompt = `
          Write lyrics for a ${project.genre} song titled "${project.title}".
          Mood: ${project.mood}.
          Style Description: ${project.styleDescription || 'Standard style'}.
          BPM: ${project.bpm || 95}
          Language Preference: ${language}.
          Target Duration: ${lyricLength}.
          
          CRITICAL: Follow this Structure strictly in this exact order:
          ${structureText}

          Negative Constraints (DO NOT INCLUDE): ${project.excludedThemes || 'None'}.
          
          ${danceModeInstruction}
          
          ${introInstruction}
          ${referenceInfo}

          Instructions:
          - Reflect the "Style Description" in the choice of words and emotional tone.
          ${autoAdjustLength ? `- Target Duration is ${lyricLength}. STRICTLY Adjust the number of lines and stanza length accordingly to match the duration.` : `- Target Duration is ${lyricLength}.`}
          - Output MUST strictly match the defined structure blocks. Generate lyrics for EVERY block in the list.
          - Output format: Include the structure tags (e.g., [Verse 1]) before the lyrics for each block.
          
          CRITICAL: DANCEABILITY & RHYTHM (Jeong-bak / 정박):
          - The song must have a comfortable, unchanging, steady beat suitable for social dancing.
          - Lyrics must match this steady rhythm perfectly (On-Beat). 
          - avoid complex syncopation, rubato, or wordy poetic lines that disrupt the groove.
          
          ${project.djName ? `- IMPORTANT: Include a shoutout to "${project.djName}" in EITHER the [Intro] OR the [Outro]. Choose ONE location only. Do NOT repeat it.` : ''}
        `;

        const response: any = await getGenAI().models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { thinkingConfig: { thinkingBudget: 2048 } } 
        });
        
        onUpdate({ lyrics: response.text });
    } catch (e) {
        alert('Failed to generate lyrics');
    }
    setLoading(false);
  };

  const generateVariations = async () => {
      setLoadingVariations(true);
      try {
          const structureText = project.structure.map((s: SongBlock) => `[${s.type}]: ${s.description}`).join('\n');
          const prompt = `
            Generate 5 distinct and creative lyric concepts for a ${project.genre} song.
            Topic: ${project.concept || 'Freestyle'}
            Mood: ${project.mood}
            Style: ${project.styleDescription || 'Standard'}
            
            CRITICAL: Follow this Structure strictly in this exact order for all 5 variations:
            ${structureText}
            
            Requirements:
            1. Create 5 different versions (e.g., Emotional, Rhythmic, Story-telling, Minimal, Energetic).
            2. For each version, provide:
               - "title": A catchy title.
               - "rationale": A brief description (in Korean) of the style/vibe.
               - "lyrics": The full lyrics structured with tags like [Verse], [Chorus].
            3. Ensure lyrics are suitable for Suno.ai (musical generation).
            4. CRITICAL: Every version MUST include lyrics for EACH block defined in the structure in the exact order provided. Do not skip blocks or change their order.
            
            Return ONLY a JSON array of 5 objects.
            Schema: [{ title: string, rationale: string, lyrics: string }]
          `;

          const response: any = await getGenAI().models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            rationale: { type: Type.STRING },
                            lyrics: { type: Type.STRING }
                        },
                        required: ['title', 'rationale', 'lyrics']
                    }
                }
            }
        });
        
        const data = JSON.parse(response.text || '[]');
        // Save variations to project
        onUpdate({ lyricVariations: data, selectedLyricVariationIndex: null });
        setFocusedCardIndex(null); // Reset focus
      } catch (e) {
          console.error(e);
          alert('Failed to generate variations.');
      }
      setLoadingVariations(false);
  };

  const copyToClipboard = () => {
    if (!project.lyrics) return;
    navigator.clipboard.writeText(project.lyrics);
    alert('Lyrics Copied!');
  };

  const applyVariation = (v: any, index: number) => {
      if (confirm('이 가사를 에디터에 적용하시겠습니까? (기존 내용은 덮어씌워집니다)')) {
          onUpdate({ lyrics: v.lyrics, selectedLyricVariationIndex: index });
      }
  };

  const titleColor = legibilityMode ? '#FFFFFF' : 'white';
  const labelColor = legibilityMode ? '#F9FAF8' : '#9ca3af';

  return (
    <div className="lyrics-view" style={{ width: '100%', height: 'calc(100vh - 150px)', display: 'grid', gridTemplateColumns: '320px 360px 1fr', gap: '20px', minHeight: '600px' }}>
      
      {/* Column 1: Settings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px' }}>
         <h2 style={{ fontSize: '20px', borderBottom: '1px solid #374151', paddingBottom: '15px', margin: 0, display:'flex', alignItems:'center', gap:'10px', color: titleColor, fontWeight: legibilityMode ? 'bold' : 'normal' }}>
            <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>tune</span> 설정 (Settings)
         </h2>

         {/* Info Box */}
         <div style={{ backgroundColor: '#111827', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
             <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: labelColor }}>현재 스타일</p>
             <p style={{ margin: 0, fontWeight: 'bold', color: '#e11d48', fontSize: '13px', lineHeight: '1.4' }}>
                {project.styleDescription || '설정된 스타일 없음'}
             </p>
             {project.introStyle && (
                    <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#fbbf24' }}>
                        + Intro: {INTRO_STYLES.find(s => s.id === project.introStyle)?.label}
                    </p>
            )}
            {project.referenceSongTitle && (
                <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#818cf8' }}>
                    + Reference: {project.referenceSongTitle} ({project.referenceArtist})
                </p>
            )}
         </div>

         {/* Controls */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
             <div>
                <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>언어 (Language)</label>
                <select 
                    value={language} 
                    onChange={e => setLanguage(e.target.value)}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px' }}
                >
                    <option>Korean & English Mix</option>
                    <option>Korean Only</option>
                    <option>English Only</option>
                    <option>Spanish & English (Latin)</option>
                </select>
            </div>
            <div>
                 <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>길이 (Duration)</label>
                 <select 
                    value={lyricLength} 
                    onChange={e => setLyricLength(e.target.value)}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '6px', fontSize: '13px' }}
                >
                    <option value="Short (~2:00)">Short (~2:00)</option>
                    <option value="Standard (~3:00)">Standard (~3:00)</option>
                    <option value="Long (~4:00)">Long (~4:00)</option>
                    <option value="Epic (~5:00+)">Epic (~5:00+)</option>
                 </select>
            </div>
            
            {/* Toggles */}
            <div 
                onClick={() => setIsDanceMode(!isDanceMode)}
                style={{ padding: '12px', backgroundColor: '#1f2937', borderRadius: '8px', border: isDanceMode ? '1px solid #10b981' : '1px solid #374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: isDanceMode ? '#10b981' : (legibilityMode ? '#FFFFFF' : '#f9fafb') }}>Dance Mode (8-count)</div>
                <div style={{ width: '36px', height: '20px', backgroundColor: isDanceMode ? '#10b981' : '#4b5563', borderRadius: '10px', position: 'relative' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isDanceMode ? '18px' : '2px', transition: 'left 0.2s' }} />
                </div>
            </div>

            <div 
                onClick={() => setAutoAdjustLength(!autoAdjustLength)}
                style={{ padding: '12px', backgroundColor: '#1f2937', borderRadius: '8px', border: autoAdjustLength ? '1px solid #fbbf24' : '1px solid #374151', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: autoAdjustLength ? '#fbbf24' : (legibilityMode ? '#FFFFFF' : '#f9fafb') }}>Auto-Length Adjust</div>
                 <div style={{ width: '36px', height: '20px', backgroundColor: autoAdjustLength ? '#fbbf24' : '#4b5563', borderRadius: '10px', position: 'relative' }}>
                    <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: autoAdjustLength ? '18px' : '2px', transition: 'left 0.2s' }} />
                </div>
            </div>

             <div>
                <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>제외 키워드 (Negative)</label>
                <input 
                    type="text" 
                    value={project.excludedThemes || ''}
                    onChange={e => onUpdate({ excludedThemes: e.target.value })}
                    style={{ width: '100%', padding: '10px', backgroundColor: '#374151', border: 'none', borderRadius: '6px', color: 'white', fontSize: '13px', boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ marginTop: '10px', paddingTop: '10px', fontSize: '13px', color: labelColor, borderTop: '1px solid #374151' }}>
                <span>BPM: {project.bpm} ({project.bpm >= 105 ? 'Fast' : 'Slow'})</span>
            </div>
         </div>

         <button 
            onClick={generateLyrics}
            disabled={loading}
            style={{ 
                width: '100%', padding: '15px', backgroundColor: loading ? '#4b5563' : '#e11d48', 
                color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer',
                marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
         >
            {loading ? 'Thinking...' : <><span className="material-symbols-outlined">auto_awesome</span> 현재 설정으로 생성</>}
         </button>
      </div>

      {/* Column 2: Variations */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', borderLeft: '1px solid #374151', borderRight: '1px solid #374151', padding: '0 20px', overflowY: 'auto' }}>
         <h2 style={{ fontSize: '20px', borderBottom: '1px solid #374151', paddingBottom: '15px', margin: 0, color: '#3b82f6', display:'flex', alignItems:'center', gap:'10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
             <span className="material-symbols-outlined">lightbulb</span> 아이디어 (5 Variations)
         </h2>
         
         <div style={{ backgroundColor: '#1e3a8a', borderRadius: '8px', padding: '15px' }}>
             <p style={{ fontSize: '12px', color: '#bfdbfe', margin: '0 0 10px 0' }}>
                 주제와 무드에 맞는 5가지 다른 스타일의 가사를 제안받아보세요. (설정한 구조가 반영됩니다)
             </p>
             <button 
                onClick={generateVariations}
                disabled={loadingVariations}
                style={{ 
                    width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: 'white', 
                    border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loadingVariations ? 'wait' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px'
                }}
             >
                {loadingVariations ? '아이디어 구상 중...' : '✨ 5가지 버전 생성하기'}
             </button>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
             {variations.length > 0 ? variations.map((v: any, i: number) => {
                 const isApplied = selectedVariationIndex === i;
                 const isSelected = focusedCardIndex === i;

                 let borderColor = '#4b5563';
                 let bgColor = '#1f2937';
                 let boxShadow = 'none';
                 let transform = 'scale(1)';

                 if (isApplied) {
                    borderColor = '#34d399';
                    bgColor = 'rgba(6, 78, 59, 0.4)';
                    boxShadow = '0 0 20px rgba(16, 185, 129, 0.2)';
                    transform = 'scale(1.02)';
                 }
                 
                 if (isSelected) {
                     borderColor = '#3b82f6';
                     if (!isApplied) {
                        bgColor = 'rgba(59, 130, 246, 0.15)';
                        transform = 'scale(1.02)';
                     }
                 }

                 return (
                     <div key={i} 
                         onClick={() => setFocusedCardIndex(i)}
                         style={{ 
                         backgroundColor: bgColor, 
                         borderRadius: '8px', 
                         border: `2px solid ${borderColor}`,
                         padding: '15px', 
                         display: 'flex', 
                         flexDirection: 'column', 
                         gap: '8px',
                         transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                         boxShadow: boxShadow,
                         transform: transform,
                         cursor: 'pointer'
                     }}>
                         <div style={{ fontWeight: 'bold', color: isApplied ? '#34d399' : (isSelected ? '#60a5fa' : '#fbbf24'), fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{i+1}. {v.title}</span>
                            {isApplied && <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#34d399' }}>check_circle</span>}
                         </div>
                         <div style={{ fontSize: '12px', color: isApplied ? '#d1fae5' : (legibilityMode ? '#E5E7EB' : '#9ca3af'), lineHeight: '1.4' }}>{v.rationale}</div>
                         <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                applyVariation(v, i);
                            }}
                            style={{ 
                                marginTop: '5px', 
                                padding: '10px', 
                                backgroundColor: isApplied ? '#10b981' : '#374151', 
                                border: 'none', 
                                borderRadius: '6px', 
                                color: 'white', 
                                fontSize: '13px', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '8px',
                                fontWeight: isApplied ? 'bold' : '500',
                                transition: 'all 0.2s',
                                boxShadow: isApplied ? '0 4px 6px rgba(0,0,0,0.2)' : 'none'
                            }}
                         >
                            {isApplied ? (
                                <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span> 적용됨 (Applied)</>
                            ) : (
                                <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span> 에디터로 적용</>
                            )}
                         </button>
                     </div>
                 );
             }) : (
                 <div style={{ textAlign: 'center', padding: '30px', color: '#4b5563' }}>
                     <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>library_music</span>
                     <p style={{ fontSize: '13px' }}>생성된 아이디어가 없습니다.</p>
                 </div>
             )}
         </div>
      </div>

      {/* Column 3: Editor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '15px', height: '41px' }}>
             <h2 style={{ fontSize: '20px', margin: 0, color: '#e11d48', display:'flex', alignItems:'center', gap:'10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                <span className="material-symbols-outlined">edit_note</span> 에디터 (Editor)
             </h2>
             <button
                 onClick={copyToClipboard}
                 disabled={!project.lyrics}
                 style={{
                    padding: '6px 12px', backgroundColor: '#374151',
                    color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer',
                    fontWeight: 'bold', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px'
                 }}
            >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>content_copy</span> 복사
            </button>
         </div>
         
         <textarea 
            value={project.lyrics || ''}
            onChange={e => onUpdate({ lyrics: e.target.value })}
            placeholder="AI가 생성한 가사가 이곳에 표시됩니다. 직접 수정할 수도 있습니다."
            style={{ 
                flex: 1, padding: '20px', borderRadius: '8px', backgroundColor: '#111827', 
                border: '1px solid #374151', color: '#e5e7eb', resize: 'none', lineHeight: '1.6', fontFamily: 'monospace',
                fontSize: '14px'
            }}
        />
      </div>
    </div>
  );
};

// --- TAB: Sound ---
const SoundTab = ({ project, onUpdate, legibilityMode }: any) => {
  const [loading, setLoading] = useState(false);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [useStrictDanceMode, setUseStrictDanceMode] = useState(true);
  const [samplePrompts, setSamplePrompts] = useState<SamplePrompt[]>([]);
  const [isAddPromptOpen, setIsAddPromptOpen] = useState(false);
  const [newPromptForm, setNewPromptForm] = useState({ label: '', text: '' });
  const [localPrompt, setLocalPrompt] = useState(project.sunoPrompt || '');
  const [isDetectingBPM, setIsDetectingBPM] = useState(false);
  const [sunoVersion, setSunoVersion] = useState<'v3.5' | 'v5'>('v5');
  const [isDanceGuideOpen, setIsDanceGuideOpen] = useState(false);
  
  // Custom Instrument Preset State
  const [customInstrumentPresets, setCustomInstrumentPresets] = useState<InstrumentPreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');

  // Constants specific to SoundTab - UPDATED FOR KPOP
  const DANCE_GUIDE = [
    { genre: 'Girl Crush', bpm: '130 - 140', key: 'F#m, C#m', desc: '강렬한 퍼포먼스. 묵직한 베이스 비트 필수.' },
    { genre: 'Cheongryang (Cool)', bpm: '115 - 126', key: 'C, G, D', desc: '청량한 느낌. 달리기 쉬운 템포.' },
    { genre: 'K-HipHop / Trap', bpm: '140 - 150', key: 'Am, Gm', desc: '빠른 하이햇과 808 베이스. 스웨그 안무.' },
    { genre: 'TikTok Challenge', bpm: '128 - 130', key: 'Any', desc: '짧고 반복적인 동작에 최적화된 하우스 리듬.' },
    { genre: 'Fusion Gugak', bpm: '90 - 110', key: 'Dm, Em', desc: '굿거리 장단이나 자진모리를 현대적으로 해석.' },
    { genre: 'Ballad (Choreo)', bpm: '70 - 90', key: 'Bb, Eb', desc: '현대무용 스타일의 서정적인 안무.' },
    { genre: 'Disco / Retro', bpm: '120 - 124', key: 'E, A', desc: '복고풍 댄스. 정박자가 매우 중요.' },
  ];

  useEffect(() => {
      setLocalPrompt(project.sunoPrompt || '');
  }, [project.sunoPrompt]);

  useEffect(() => {
    const savedPrompts = localStorage.getItem('suno_custom_prompts');
    if (savedPrompts) {
        setSamplePrompts(JSON.parse(savedPrompts));
    } else {
        setSamplePrompts(DEFAULT_SAMPLE_PROMPTS);
    }

    const savedInstrumentPresets = localStorage.getItem('suno_instrument_presets');
    if (savedInstrumentPresets) {
        setCustomInstrumentPresets(JSON.parse(savedInstrumentPresets));
    }
  }, []);

  const saveSamplePrompts = (prompts: SamplePrompt[]) => {
      setSamplePrompts(prompts);
      localStorage.setItem('suno_custom_prompts', JSON.stringify(prompts));
  };

  const saveInstrumentPresets = (presets: InstrumentPreset[]) => {
      setCustomInstrumentPresets(presets);
      localStorage.setItem('suno_instrument_presets', JSON.stringify(presets));
  };

  const handleSaveInstrumentPreset = () => {
      if (!newPresetName.trim()) {
          alert('프리셋 이름을 입력하세요.');
          return;
      }
      if (project.instruments.length === 0) {
          alert('최소 하나 이상의 악기를 선택해야 합니다.');
          return;
      }
      const updated = [...customInstrumentPresets, { name: newPresetName.trim(), instruments: [...project.instruments] }];
      saveInstrumentPresets(updated);
      setNewPresetName('');
  };

  const handleDeleteInstrumentPreset = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      const updated = [...customInstrumentPresets];
      updated.splice(index, 1);
      saveInstrumentPresets(updated);
  };

  const applyInstrumentPreset = (preset: InstrumentPreset) => {
      onUpdate({ instruments: preset.instruments });
  };

  const deleteSamplePrompt = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      const updated = [...samplePrompts];
      updated.splice(index, 1);
      saveSamplePrompts(updated);
  };

  const handleAddPrompt = () => {
      if (!newPromptForm.label || !newPromptForm.text) {
          alert('Label and Text are required');
          return;
      }
      const updated = [...samplePrompts, newPromptForm];
      saveSamplePrompts(updated);
      setNewPromptForm({ label: '', text: '' });
      setIsAddPromptOpen(false);
  };

  const toggleInstrument = (inst: string) => {
      const newInsts = project.instruments.includes(inst) 
        ? project.instruments.filter((i: string) => i !== inst)
        : [...project.instruments, inst];
      onUpdate({ instruments: newInsts });
  };

  const handleBpmUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      if (file.size > 10 * 1024 * 1024) {
          alert('File is too large. Please use a clip under 10MB.');
          return;
      }

      setIsDetectingBPM(true);
      try {
          const base64Data = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => {
                  const result = reader.result as string;
                  const base64 = result.split(',')[1];
                  resolve(base64);
              };
              reader.onerror = reject;
          });

          const prompt = "Analyze the tempo of this audio clip. Estimate the BPM (Beats Per Minute). Return ONLY the integer number (e.g. 120). Do not write any other text.";
          
          const response: any = await getGenAI().models.generateContent({
              model: 'gemini-2.5-flash',
              contents: {
                  parts: [
                      { text: prompt },
                      {
                          inlineData: {
                              mimeType: file.type,
                              data: base64Data
                          }
                      }
                  ]
              }
          });

          const text = response.text?.trim();
          const bpmMatch = text?.match(/\d+/);
          
          if (bpmMatch) {
              const bpm = parseInt(bpmMatch[0]);
              if (bpm > 0 && bpm < 300) {
                   onUpdate({ bpm });
                   alert(`BPM Detected: ${bpm}`);
              } else {
                   alert('Detected value seems invalid. Please try again.');
              }
          } else {
              alert('Could not detect BPM from the audio.');
          }
      } catch (e) {
          console.error(e);
          alert('Failed to analyze audio.');
      } finally {
          setIsDetectingBPM(false);
          e.target.value = '';
      }
  };

  const generatePrompt = async () => {
    setLoading(true);
    try {
        let danceInstruction = '';
        if (useStrictDanceMode) {
             danceInstruction = `
             STRICT DANCE MODE:
             - The beat MUST be constant and steady (Metronomic).
             - Emphasis on the "1" count.
             - Clear percussion suitable for K-Pop choreography.
             `;
        }

        let introInstruction = '';
        if (project.introStyle) {
            const style = INTRO_STYLES.find(s => s.id === project.introStyle);
            if (style) {
                introInstruction = `Intro Style: ${style.sunoTags}`;
            }
        }

        const versionContext = sunoVersion === 'v5' 
            ? "Suno v5 (Latest). Focus on high-fidelity, clarity, and modern production standards." 
            : "Suno.ai v3.5 (Standard).";

        const prompt = `
          Construct a high-quality prompt for a music generation AI (${versionContext}).
          
          Project Metadata:
          - Genre: ${project.genre} (${project.subGenre})
          - Mood: ${project.mood}
          - Style: ${project.styleDescription}
          - Instruments: ${(project.instruments || []).join(', ')}
          - Vocal Type: ${project.vocalType}
          - BPM: ${project.bpm}
          - Key: ${project.key}
          
          ${danceInstruction}
          ${introInstruction}

          Requirement:
          - Create a comma-separated list of tags and style descriptors.
          - Include genre, mood, key instruments, vocal type, and production style.
          - Format: "[Tag 1], [Tag 2], [Tag 3], ..."
          - Limit to around 200 characters max.
          - Output ONLY the prompt string.
        `;

        const response: any = await getGenAI().models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: prompt,
        });
        
        onUpdate({ sunoPrompt: response.text });
    } catch (e) {
        alert('Prompt generation failed');
    }
    setLoading(false);
  };

  const generateCompositionAdvice = async () => {
    setLoadingAdvice(true);
    try {
        const prompt = `
          Provide professional AI music composition suggestions for a ${project.genre} (${project.subGenre}) song.
          Mood: ${project.mood}. 
          BPM: ${project.bpm}. 
          Key: ${project.key}. 
          Instruments: ${project.instruments.join(', ')}.

          Requirements:
          - Provide structured advice in Korean.
          - Focus on 3 categories: 
            1. Rhythmic Patterns (리듬 가이드)
            2. Melodic Style (멜로디 제안)
            3. Harmonic Progression (추천 코드 진행)
          - Be specific to the genre.
          - keep it concise and actionable for someone creating music in Suno.ai.
          - Format with Markdown.
        `;

        const response: any = await getGenAI().models.generateContent({
             model: 'gemini-3-flash-preview',
             contents: prompt,
        });
        
        onUpdate({ compositionAdvice: response.text });
    } catch (e) {
        alert('Composition advice generation failed');
    }
    setLoadingAdvice(false);
  };

  const applyPreset = (preset: any) => {
      onUpdate({
          bpm: preset.bpm,
          key: preset.key,
          instruments: preset.instruments || []
      });
  };

  const handleSavePrompt = () => {
      onUpdate({ sunoPrompt: localPrompt });
      const btn = document.getElementById('save-prompt-btn');
      if (btn) {
          const originalText = btn.innerText;
          btn.innerText = 'Saved!';
          setTimeout(() => { btn.innerText = originalText; }, 1500);
      }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(localPrompt);
      alert('Prompt Copied!');
  };

  const titleColor = legibilityMode ? '#FFFFFF' : '#fbbf24';
  const labelColor = legibilityMode ? '#F9FAF8' : '#9ca3af';

  return (
      <div className="responsive-grid-3" style={{ width: '100%', height: 'calc(100vh - 150px)', display: 'grid', gridTemplateColumns: '3fr 2fr 5fr', gap: '20px', minHeight: '600px' }}>
          
          {/* Column 1: Configuration */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px', borderRight: '1px solid #374151' }}>
              <h2 style={{ fontSize: '18px', borderBottom: '1px solid #374151', paddingBottom: '15px', margin: 0, color: titleColor, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                  <span className="material-symbols-outlined">settings</span> 설정 (Config)
              </h2>

              {/* Presets */}
              <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: labelColor }}>장르 프리셋 (Presets)</label>
                  <select 
                      onChange={(e) => {
                          const preset = GENRE_PRESETS[project.genre]?.find(p => p.label === e.target.value);
                          if (preset) applyPreset(preset);
                      }}
                      style={{ width: '100%', padding: '10px', backgroundColor: '#111827', color: 'white', border: '1px solid #4b5563', borderRadius: '6px' }}
                  >
                      <option value="">-- 프리셋 선택 --</option>
                      {GENRE_PRESETS[project.genre]?.map((p, i) => (
                          <option key={i} value={p.label}>{p.label}</option>
                      ))}
                  </select>
              </div>

              {/* BPM & Key */}
              <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
                      {/* BPM Section */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: labelColor, fontWeight: '500' }}>BPM</label>
                          <div style={{ display: 'flex', gap: '8px', height: '42px' }}>
                             <input 
                                type="number" 
                                value={project.bpm || ''} 
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  onUpdate({ bpm: isNaN(val) ? 0 : val });
                                }}
                                style={{ 
                                    flex: 1, padding: '0 12px', backgroundColor: '#111827', 
                                    border: '1px solid #4b5563', color: 'white', borderRadius: '6px', 
                                    minWidth: '0', height: '100%', fontSize: '14px', boxSizing: 'border-box'
                                }} 
                             />
                             <input 
                                type="file" 
                                id="bpm-upload"
                                accept="audio/*" 
                                style={{ display: 'none' }}
                                onChange={handleBpmUpload}
                             />
                             <label 
                                htmlFor="bpm-upload"
                                title="Upload audio to detect BPM"
                                style={{ 
                                    width: '42px', backgroundColor: '#374151', color: '#e5e7eb', borderRadius: '6px', 
                                    cursor: isDetectingBPM ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent:'center',
                                    flexShrink: 0, height: '100%', border: '1px solid #4b5563', boxSizing: 'border-box',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#4b5563'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#374151'}
                             >
                                {isDetectingBPM ? '⏳' : <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>graphic_eq</span>}
                             </label>
                         </div>
                      </div>
                      
                      {/* Key Section */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: labelColor, fontWeight: '500' }}>Key (조성)</label>
                          <select 
                              value={project.key || ''} 
                              onChange={e => onUpdate({ key: e.target.value })}
                              style={{ 
                                  width: '100%', padding: '0 12px', backgroundColor: '#111827', 
                                  border: '1px solid #4b5563', color: 'white', borderRadius: '6px',
                                  height: '42px', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer'
                              }}
                          >
                               {['C', 'Cm', 'C#', 'C#m', 'D', 'Dm', 'Eb', 'Ebm', 'E', 'Em', 'F', 'Fm', 'F#', 'F#m', 'G', 'Gm', 'Ab', 'Abm', 'A', 'Am', 'Bb', 'Bbm', 'B', 'Bm'].map(k => (
                                   <option key={k} value={k}>{k}</option>
                               ))}
                          </select>
                      </div>
                  </div>

                  <button 
                    onClick={() => setIsDanceGuideOpen(true)}
                    style={{ 
                        width: '100%', marginBottom: '15px', padding: '8px', 
                        backgroundColor: '#374151', color: '#fbbf24', border: '1px dashed #4b5563', 
                        borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>menu_book</span>
                    BPM & Key 가이드 보기
                  </button>

                  <div>
                      <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: labelColor }}>보컬 타입 (Vocal Type)</label>
                      <select 
                          value={project.vocalType || ''} 
                          onChange={e => onUpdate({ vocalType: e.target.value })}
                          style={{ width: '100%', padding: '10px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '4px' }}
                      >
                          <option value="Male">Male (남성)</option>
                          <option value="Female">Female (여성)</option>
                          <option value="Duet">Duet (듀엣)</option>
                          <option value="Choir">Choir (합창)</option>
                          <option value="Instrumental">Instrumental (연주곡)</option>
                      </select>
                  </div>
              </div>
          </div>

          {/* Column 2: Instruments & Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px', borderRight: '1px solid #374151' }}>
              <h2 style={{ fontSize: '18px', borderBottom: '1px solid #374151', paddingBottom: '15px', margin: 0, color: '#e11d48', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                  <span className="material-symbols-outlined">piano</span> 악기 (Instruments)
              </h2>

               {/* Dance Mode Toggle */}
               <div 
                    onClick={() => setUseStrictDanceMode(!useStrictDanceMode)}
                    style={{ 
                        padding: '15px', backgroundColor: '#1f2937', borderRadius: '8px', 
                        border: useStrictDanceMode ? '1px solid #10b981' : '1px solid #374151', 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span className="material-symbols-outlined" style={{ color: useStrictDanceMode ? '#10b981' : '#6b7280' }}>music_note</span>
                        <div>
                            <span style={{ display: 'block', fontWeight: 'bold', color: useStrictDanceMode ? '#10b981' : (legibilityMode ? '#FFFFFF' : '#f3f4f6'), fontSize: '13px' }}>Strict Dance Mode</span>
                            <span style={{ fontSize: '10px', color: labelColor }}>Steady beat & clear rhythm</span>
                        </div>
                    </div>
                     <div style={{ width: '36px', height: '20px', backgroundColor: useStrictDanceMode ? '#10b981' : '#4b5563', borderRadius: '10px', position: 'relative' }}>
                        <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: useStrictDanceMode ? '18px' : '2px', transition: 'left 0.2s' }} />
                    </div>
                </div>

              {/* Instrument Selection */}
              <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {INSTRUMENTS.map(inst => (
                          <button
                              key={inst}
                              onClick={() => toggleInstrument(inst)}
                              style={{
                                  padding: '6px 10px', fontSize: '11px', borderRadius: '15px', border: '1px solid',
                                  backgroundColor: project.instruments?.includes(inst) ? 'rgba(225, 29, 72, 0.2)' : '#1f2937',
                                  borderColor: project.instruments?.includes(inst) ? '#e11d48' : '#374151',
                                  color: project.instruments?.includes(inst) ? '#e11d48' : (legibilityMode ? '#E5E7EB' : '#9ca3af'),
                                  cursor: 'pointer', flexGrow: 1, textAlign: 'center'
                              }}
                          >
                              {inst}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Custom Instrument Presets */}
              <div style={{ marginTop: 'auto', borderTop: '1px solid #374151', paddingTop: '20px' }}>
                  <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '8px' }}>나의 악기 프리셋 (My Presets)</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <input 
                            type="text" 
                            value={newPresetName}
                            onChange={(e) => setNewPresetName(e.target.value)}
                            placeholder="프리셋 이름..."
                            style={{ flex: 1, padding: '8px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                        />
                        <button 
                            onClick={handleSaveInstrumentPreset}
                            style={{ padding: '0 12px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                        >
                            Save
                        </button>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {customInstrumentPresets.length > 0 ? customInstrumentPresets.map((p, idx) => (
                          <div 
                            key={idx}
                            style={{ position: 'relative', display: 'inline-flex' }}
                          >
                              <button 
                                onClick={() => applyInstrumentPreset(p)}
                                style={{ 
                                    padding: '6px 28px 6px 12px', 
                                    backgroundColor: '#374151', 
                                    border: '1px solid #4b5563',
                                    borderRadius: '15px',
                                    color: '#FFFFFF',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                                title={p.instruments.join(', ')}
                              >
                                {p.name}
                              </button>
                              <span 
                                onClick={(e) => handleDeleteInstrumentPreset(e, idx)}
                                style={{ 
                                    position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '14px', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold'
                                }}
                              >
                                &times;
                              </span>
                          </div>
                      )) : (
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>저장된 프리셋이 없습니다.</span>
                      )}
                  </div>
              </div>
          </div>

          {/* Column 3: Output */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '18px', borderBottom: '1px solid #374151', paddingBottom: '15px', margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                  <span className="material-symbols-outlined">auto_awesome</span> 생성 (Prompt)
              </h2>

              {/* Version Selector */}
              <div style={{ display: 'flex', backgroundColor: '#111827', padding: '4px', borderRadius: '8px', gap: '4px', border: '1px solid #374151' }}>
                  <button 
                    onClick={() => setSunoVersion('v3.5')}
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: sunoVersion === 'v3.5' ? '#374151' : 'transparent', color: sunoVersion === 'v3.5' ? 'white' : '#6b7280', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Suno v3.5
                  </button>
                  <button 
                    onClick={() => setSunoVersion('v5')}
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', backgroundColor: sunoVersion === 'v5' ? '#e11d48' : 'transparent', color: sunoVersion === 'v5' ? 'white' : '#6b7280', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                  >
                    Suno v5 (Pro)
                  </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button 
                      onClick={generatePrompt}
                      disabled={loading}
                      style={{ flex: '1 1 120px', padding: '15px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                      {loading ? 'Generating...' : <><span className="material-symbols-outlined">auto_fix_high</span> 프롬프트 생성</>}
                  </button>
                  <button 
                      onClick={generateCompositionAdvice}
                      disabled={loadingAdvice}
                      style={{ flex: '1 1 120px', padding: '15px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                      {loadingAdvice ? 'Guiding...' : <><span className="material-symbols-outlined">music_note</span> AI 작곡 가이드</>}
                  </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <textarea 
                      value={localPrompt}
                      onChange={e => setLocalPrompt(e.target.value)}
                      placeholder="Suno.ai 프롬프트가 여기에 생성됩니다."
                      style={{ width: '100%', padding: '15px', borderRadius: '8px', backgroundColor: '#111827', border: '1px solid #374151', color: '#fbbf24', resize: 'none', fontFamily: 'monospace', minHeight: '120px', boxSizing: 'border-box' }}
                  />
                  <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                       <span style={{ fontSize: '11px', color: '#6b7280' }}>
                          {localPrompt.length} chars
                       </span>
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                              id="save-prompt-btn"
                              onClick={handleSavePrompt}
                              style={{ padding: '6px 12px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                          >
                              Save
                          </button>
                          <button 
                              onClick={copyToClipboard}
                              style={{ padding: '6px 12px', backgroundColor: '#374151', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
                          >
                              Copy
                          </button>
                      </div>
                  </div>
                </div>

                {/* AI Composition Advice Display */}
                {project.compositionAdvice && (
                    <div style={{ backgroundColor: '#111827', border: '1px solid #3b82f6', borderRadius: '12px', padding: '20px', marginTop: '10px' }}>
                        <h3 style={{ margin: '0 0 15px 0', color: '#3b82f6', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="material-symbols-outlined">lightbulb</span> AI 작곡 제안 (Composition Advice)
                        </h3>
                        <div style={{ 
                            fontSize: '13px', color: '#e5e7eb', lineHeight: '1.6', 
                            maxHeight: '400px', overflowY: 'auto', paddingRight: '10px',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {project.compositionAdvice}
                        </div>
                    </div>
                )}
              </div>
              
              <div style={{ marginTop: 'auto', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <p style={{ fontSize: '13px', color: labelColor, margin: 0 }}>📌 Quick Sample Prompts</p>
                    <button 
                        onClick={() => setIsAddPromptOpen(true)}
                        style={{ 
                            background: 'transparent', border: '1px solid #4b5563', color: labelColor,
                            borderRadius: '4px', padding: '2px 8px', fontSize: '11px', cursor: 'pointer'
                        }}
                    >
                        + Add Custom
                    </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                    {samplePrompts.map((sample, idx) => (
                        <div 
                            key={idx}
                            style={{ position: 'relative', display: 'inline-flex' }}
                        >
                            <button 
                                onClick={() => onUpdate({ sunoPrompt: sample.text })}
                                style={{ 
                                    padding: '6px 24px 6px 10px', 
                                    backgroundColor: '#1f2937', 
                                    border: '1px solid #374151',
                                    borderRadius: '15px',
                                    color: legibilityMode ? '#FFFFFF' : '#d1d5db',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '180px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#374151';
                                    e.currentTarget.style.borderColor = '#6b7280';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#1f2937';
                                    e.currentTarget.style.borderColor = '#374151';
                                }}
                                title={sample.text}
                            >
                                {sample.label}
                            </button>
                            <span 
                                onClick={(e) => deleteSamplePrompt(e, idx)}
                                style={{ 
                                    position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '12px', color: '#ef4444', cursor: 'pointer',
                                    opacity: 0.6
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                            >
                                &times;
                            </span>
                        </div>
                    ))}
                </div>
            </div>
          </div>
          
          {isAddPromptOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
                <div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '16px', border: '1px solid #374151', width: '400px', maxWidth: '90vw', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'white' }}>Add Custom Prompt</h3>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '4px' }}>Label (Name)</label>
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="e.g. My Favorite Jazz"
                            value={newPromptForm.label}
                            onChange={(e) => setNewPromptForm({...newPromptForm, label: e.target.value})}
                            style={{ width: '100%', padding: '10px', backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '4px' }}>Prompt Text</label>
                        <textarea 
                            placeholder="Paste your prompt here..."
                            value={newPromptForm.text}
                            onChange={(e) => setNewPromptForm({...newPromptForm, text: e.target.value})}
                            style={{ width: '100%', height: '100px', padding: '10px', backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', resize: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button 
                            onClick={() => setIsAddPromptOpen(false)}
                            style={{ padding: '8px 16px', backgroundColor: 'transparent', color: labelColor, border: 'none', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleAddPrompt}
                            style={{ padding: '8px 16px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            Save Prompt
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Dance Guide Modal */}
        {isDanceGuideOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(4px)' }}>
                <div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '16px', border: '1px solid #374151', width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>accessibility_new</span>
                            BPM & Key 가이드
                        </h3>
                        <button onClick={() => setIsDanceGuideOpen(false)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    
                    <div style={{ color: '#d1d5db' }}>
                        <p style={{ fontSize: '13px', color: labelColor, marginBottom: '15px' }}>
                            Suno.ai에서 선호하는 음악을 만들기 위한 추천 설정값입니다.
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #4b5563', color: '#e11d48' }}>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>장르 (Genre)</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>BPM Range</th>
                                    <th style={{ padding: '10px', textAlign: 'left' }}>추천 Key</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DANCE_GUIDE.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #374151' }}>
                                        <td style={{ padding: '10px', fontWeight: 'bold', color: '#FFFFFF' }}>{item.genre}</td>
                                        <td style={{ padding: '10px', color: '#fbbf24' }}>{item.bpm}</td>
                                        <td style={{ padding: '10px', color: '#FFFFFF' }}>{item.key}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                        <button 
                            onClick={() => setIsDanceGuideOpen(false)}
                            style={{ padding: '8px 24px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            확인 (Close)
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
  );
};

// --- TAB: Art ---
const ArtTab = ({ project, onUpdate, legibilityMode }: any) => {
    const [loading, setLoading] = useState(false);
    const [size, setSize] = useState<'1K'|'2K'|'4K'>('1K');
    const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');
    const [selectedSizePreset, setSelectedSizePreset] = useState(0);
    
    // 1. 노래 정보
    const [artTitle, setArtTitle] = useState(project.title || '');
    const [artistName, setArtistName] = useState(project.djName || '');
    const [artistSamples, setArtistSamples] = useState<string[]>([]);

    // 2. 비주얼 컨셉
    const [visualMood, setVisualMood] = useState(project.mood || 'Atmospheric');
    const [visualStyle, setVisualStyle] = useState('Digital Art');
    const [characters, setCharacters] = useState('');
    const [artDescription, setArtDescription] = useState('');

    // 3. 텍스트 디자인 (고급)
    const [fontType, setFontType] = useState(FONT_OPTIONS[0].value);
    const [textEffect, setTextEffect] = useState(TEXT_EFFECT_OPTIONS[0].id);
    const [textColor, setTextColor] = useState('#ffffff');
    const [textOverlay, setTextOverlay] = useState({ x: 50, y: 90, size: 40, opacity: 100 });

    // Generation Mode
    const [generationMode, setGenerationMode] = useState<'AI' | 'PROMPT_ONLY' | 'MOCK'>('AI');
    const [generatedPrompt, setGeneratedPrompt] = useState('');

    // Init Sample Artists
    useEffect(() => {
        const saved = localStorage.getItem('suno_art_artists');
        setArtistSamples(saved ? JSON.parse(saved) : DEFAULT_ARTISTS);
    }, []);

    const saveArtists = (list: string[]) => {
        setArtistSamples(list);
        localStorage.setItem('suno_art_artists', JSON.stringify(list));
    };

    const addArtistSample = () => {
        if (artistName && !artistSamples.includes(artistName)) {
            saveArtists([...artistSamples, artistName]);
        }
    };

    const removeArtistSample = (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        saveArtists(artistSamples.filter(a => a !== name));
    };

    // Sync title initially if empty, but allow divergence
    useEffect(() => {
        if (!artTitle && project.title) setArtTitle(project.title);
    }, [project.title]);

    const handleDownload = () => {
        if (!project.coverImage) return;

        // --- Synthetic Rendering for Download (Canvas Based) ---
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // 1. Draw Background
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            // 2. Configure Text Styles
            const currentEffect = TEXT_EFFECT_OPTIONS.find(e => e.id === textEffect);
            const style = currentEffect?.style || {};
            
            // Text Color
            ctx.fillStyle = (style as any).color || textColor;
            
            // Position calc (relative to canvas size)
            const posX = (textOverlay.x / 100) * canvas.width;
            const posY = (textOverlay.y / 100) * canvas.height;
            
            // Adjust Font Size (scale based on canvas vs preview UI)
            // Assuming UI preview max width is roughly 600px
            const scaleFactor = canvas.width / 600; 
            const scaledSize = textOverlay.size * scaleFactor;
            
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Apply Shadow Effect if present
            if ((style as any).textShadow) {
                const shadow = (style as any).textShadow as string;
                // Parse "2px 2px 4px rgba(0,0,0,0.5)"
                const parts = shadow.split(',')[0].trim().split(' ');
                ctx.shadowBlur = parseFloat(parts[2] || '0');
                ctx.shadowOffsetX = parseFloat(parts[0] || '0');
                ctx.shadowOffsetY = parseFloat(parts[1] || '0');
                ctx.shadowColor = shadow.includes('rgba') ? shadow.substring(shadow.indexOf('rgba')) : 'rgba(0,0,0,0.5)';
            }

            // Apply Outline Effect if present
            if ((style as any).WebkitTextStroke) {
                const stroke = (style as any).WebkitTextStroke as string;
                const parts = stroke.split(' ');
                ctx.strokeStyle = parts[1] || 'black';
                ctx.lineWidth = (parseFloat(parts[0]) || 1) * scaleFactor * 2;
            }

            // A. Draw Title
            ctx.font = `bold ${scaledSize}px ${fontType}`;
            if ((style as any).WebkitTextStroke) ctx.strokeText(artTitle, posX, posY);
            ctx.fillText(artTitle, posX, posY);

            // B. Draw Artist (below title)
            const artistSize = scaledSize * 0.5;
            ctx.font = `${artistSize}px ${fontType}`;
            ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; // Clear shadow for subtext unless desired
            ctx.fillText(artistName, posX, posY + (scaledSize * 0.7));

            // 3. Finalize Download
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${project.title.replace(/\s+/g, '_') || 'album_cover'}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        img.src = project.coverImage;
    };

    const generateCoverArt = async () => {
        setLoading(true);
        setGeneratedPrompt('');

        const sizePreset = IMAGE_SIZE_PRESETS[selectedSizePreset];
        let promptAddon = '';
        if (sizePreset.id === 5) promptAddon = 'Composition framed for 4:5 aspect ratio.';
        if (sizePreset.id === 6) promptAddon = 'Wide composition suitable for 1.91:1 link preview.';
        if (sizePreset.id === 7) promptAddon = 'Cinematic 21:9 aspect ratio composition.';
        if (sizePreset.id === 8) promptAddon = 'Tall 1:2 aspect ratio vertical composition.';
        if (sizePreset.id === 9) promptAddon = 'Circular vignette composition centered.';

        const prompt = `
        Album cover art for a song.
        
        [Song Info]
        Genre: ${project.genre}
        
        [Visual Concept]
        Mood: ${visualMood}
        Style: ${visualStyle}
        Subject/Characters: ${characters}
        Detailed Description: ${artDescription || 'A creative and atmospheric composition representing the music.'}
        
        Instructions:
        - High quality, creative composition.
        - Target Ratio: ${sizePreset.label} (${sizePreset.ratio})
        ${promptAddon}
        - Do NOT add text if possible, as it will be added as an overlay.
        `.trim();

        try {
            if (generationMode === 'AI') {
                const modelName = modelType === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
                const imageConfig: any = { aspectRatio: getApiAspectRatio(sizePreset.ratio) };
                if (modelType === 'pro') {
                    imageConfig.imageSize = size;
                }

                const response: any = await getGenAI().models.generateContent({
                    model: modelName,
                    contents: {
                       parts: [{ text: prompt }]
                    },
                    config: {
                        imageConfig: imageConfig
                    }
                });

                let imageUrl = '';
                if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            const base64EncodeString = part.inlineData.data;
                            imageUrl = `data:image/png;base64,${base64EncodeString}`;
                            break;
                        }
                    }
                }
                
                if (imageUrl) {
                    onUpdate({ coverImage: imageUrl });
                } else {
                    alert('No image generated.');
                }

            } else if (generationMode === 'PROMPT_ONLY') {
                setGeneratedPrompt(prompt);
            } else if (generationMode === 'MOCK') {
                // Mock Generation using Canvas
                const canvas = document.createElement('canvas');
                let width = 1024;
                let height = 1024;
                if (sizePreset.ratio === '16:9') { height = 576; }
                else if (sizePreset.ratio === '9:16') { width = 576; }
                else if (sizePreset.ratio === '4:3') { height = 768; }
                else if (sizePreset.ratio === '3:4') { width = 768; }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    const gradient = ctx.createLinearGradient(0, 0, width, height);
                    gradient.addColorStop(0, '#1f2937');
                    gradient.addColorStop(1, '#111827');
                    if (visualMood.includes('Happy') || visualMood.includes('Party')) {
                        gradient.addColorStop(0.5, '#f59e0b');
                    } else if (visualMood.includes('Romantic') || visualMood.includes('Sexy')) {
                        gradient.addColorStop(0.5, '#e11d48');
                    } else if (visualMood.includes('Sad') || visualMood.includes('Chill')) {
                        gradient.addColorStop(0.5, '#3b82f6');
                    }
                    ctx.fillStyle = gradient;
                    ctx.fillRect(0, 0, width, height);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
                    ctx.beginPath();
                    ctx.arc(width/2, height/2, width/3, 0, 2 * Math.PI);
                    ctx.fill();
                    onUpdate({ coverImage: canvas.toDataURL() });
                }
            }
        } catch (e) {
            console.error(e);
            alert('Image generation failed.');
        }
        setLoading(false);
    };

    const currentRatioConfig = IMAGE_SIZE_PRESETS[selectedSizePreset];
    const previewAspectRatio = currentRatioConfig.ratio.replace(':', '/');
    const currentEffectStyle = TEXT_EFFECT_OPTIONS.find(e => e.id === textEffect)?.style || {};
    const titleColor = legibilityMode ? '#FFFFFF' : '#fbbf24';
    const labelColor = legibilityMode ? '#F9FAF8' : '#9ca3af';

    return (
        <div className="responsive-grid-3" style={{ width: '100%', height: 'calc(100vh - 150px)', display: 'grid', gridTemplateColumns: '320px 320px 1fr', gap: '20px', minHeight: '600px' }}>
            
            {/* Column 1: Concept */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px', borderRight: '1px solid #374151' }}>
                 <h2 style={{ fontSize: '18px', borderBottom: '1px solid #374151', paddingBottom: '15px', margin: 0, color: titleColor, display: 'flex', alignItems: 'center', gap: '10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                    <span className="material-symbols-outlined">palette</span> 컨셉 (Concept)
                 </h2>
                
                <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: legibilityMode ? '#FFFFFF' : '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                        1. 노래 정보 (Song Info)
                    </h3>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>앨범 제목 (Title)</label>
                        <input 
                            type="text" 
                            value={artTitle} 
                            onChange={(e) => setArtTitle(e.target.value)}
                            placeholder="Title"
                            style={{ width: '100%', padding: '10px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>아티스트 (Artist)</label>
                        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                            <input 
                                type="text" 
                                value={artistName} 
                                onChange={(e) => setArtistName(e.target.value)}
                                placeholder="Artist Name"
                                style={{ flex: 1, padding: '10px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} 
                            />
                            <button onClick={addArtistSample} style={{ padding: '0 12px', backgroundColor: '#374151', border: '1px solid #4b5563', color: '#10b981', borderRadius: '6px', cursor: 'pointer' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {artistSamples.map((a, i) => (
                                <div key={i} onClick={() => setArtistName(a)} 
                                    style={{ 
                                        fontSize: '11px', padding: '4px 8px', borderRadius: '12px', 
                                        backgroundColor: '#111827', border: '1px solid #4b5563', color: legibilityMode ? '#FFFFFF' : '#d1d5db', 
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    {a}
                                    <span onClick={(e) => removeArtistSample(a, e)} style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'bold' }}>×</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: legibilityMode ? '#FFFFFF' : '#e11d48', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                        2. 비주얼 컨셉 (Visual Concept)
                    </h3>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>스타일 (Style)</label>
                        <select value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#111827', color: 'white', border: '1px solid #4b5563', borderRadius: '6px' }}>
                            {ART_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>등장인물 (Characters)</label>
                        <select onChange={(e) => setCharacters(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: '#111827', color: 'white', border: '1px solid #4b5563', borderRadius: '6px', marginBottom: '8px' }}>
                            <option value="">-- 샘플 선택 --</option>
                            {CHARACTER_SAMPLES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input 
                            type="text" 
                            value={characters} 
                            onChange={(e) => setCharacters(e.target.value)}
                            placeholder="직접 입력..."
                            style={{ width: '100%', padding: '10px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} 
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>상세 설명 (Description)</label>
                        <textarea 
                            value={artDescription}
                            onChange={(e) => setArtDescription(e.target.value)}
                            placeholder="구체적인 장면 묘사..."
                            style={{ width: '100%', height: '60px', padding: '10px', backgroundColor: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', resize: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
            </div>

            {/* Column 2: Design */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '10px', borderRight: '1px solid #374151' }}>
                <h2 style={{ fontSize: '18px', borderBottom: '1px solid #374151', paddingBottom: '15px', margin: 0, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                    <span className="material-symbols-outlined">brush</span> 디자인 (Design)
                 </h2>

                <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: legibilityMode ? '#FFFFFF' : '#818cf8', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                        3. 텍스트 디자인 (Overlay)
                    </h3>
                    <p style={{ fontSize: '11px', color: labelColor, marginTop: '-10px', marginBottom: '15px' }}>* 이미지 생성 후 적용되는 오버레이 텍스트입니다.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>폰트 (Font)</label>
                            <select value={fontType} onChange={(e) => setFontType(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#111827', color: 'white', border: '1px solid #4b5563', borderRadius: '6px', fontSize: '12px' }}>
                                {FONT_OPTIONS.map((font, idx) => (
                                    <option key={idx} value={font.value} style={{ fontFamily: font.value }}>{font.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                             <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>텍스트 효과 (Effect)</label>
                             <select value={textEffect} onChange={(e) => setTextEffect(e.target.value)} style={{ width: '100%', padding: '8px', backgroundColor: '#111827', color: 'white', border: '1px solid #4b5563', borderRadius: '6px', fontSize: '12px' }}>
                                {TEXT_EFFECT_OPTIONS.map((effect, idx) => (
                                    <option key={idx} value={effect.id}>{effect.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>기본 색상 (Color)</label>
                            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: '100%', height: '34px', padding: '0', border: 'none', cursor: 'pointer', borderRadius: '4px' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: labelColor, marginBottom: '4px' }}>
                                <span>가로 위치 (X Position)</span> <span>{textOverlay.x}%</span>
                            </label>
                            <input type="range" min="0" max="100" value={textOverlay.x} onChange={e => setTextOverlay({...textOverlay, x: parseInt(e.target.value)})} style={{ width: '100%', cursor: 'pointer' }} />
                        </div>
                        <div>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: labelColor, marginBottom: '4px' }}>
                                <span>세로 위치 (Y Position)</span> <span>{textOverlay.y}%</span>
                            </label>
                            <input type="range" min="0" max="100" value={textOverlay.y} onChange={e => setTextOverlay({...textOverlay, y: parseInt(e.target.value)})} style={{ width: '100%', cursor: 'pointer' }} />
                        </div>
                        <div>
                            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: labelColor, marginBottom: '4px' }}>
                                <span>텍스트 크기 (Size)</span> <span>{textOverlay.size}px</span>
                            </label>
                            <input type="range" min="10" max="150" value={textOverlay.size} onChange={e => setTextOverlay({...textOverlay, size: parseInt(e.target.value)})} style={{ width: '100%', cursor: 'pointer' }} />
                        </div>
                    </div>
                </div>

                <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '15px', color: legibilityMode ? '#FFFFFF' : 'white', fontWeight: legibilityMode ? 'bold' : 'normal' }}>생성 옵션 (Generation)</h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '8px' }}>모델 선택 (Model)</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <label style={{ flex: '1 1 100px', padding: '10px', borderRadius: '8px', border: modelType === 'flash' ? '1px solid #fbbf24' : '1px solid #4b5563', backgroundColor: modelType === 'flash' ? 'rgba(251, 191, 36, 0.1)' : 'transparent', cursor: 'pointer', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <input type="radio" checked={modelType === 'flash'} onChange={() => setModelType('flash')} style={{ display: 'none' }} />
                                <span style={{ fontWeight: 'bold', color: modelType === 'flash' ? '#fbbf24' : labelColor }}>Na Banana</span>
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>(Fast)</span>
                            </label>
                            <label style={{ flex: '1 1 100px', padding: '10px', borderRadius: '8px', border: modelType === 'pro' ? '1px solid #e11d48' : '1px solid #4b5563', backgroundColor: modelType === 'pro' ? 'rgba(225, 29, 72, 0.1)' : 'transparent', cursor: 'pointer', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <input type="radio" checked={modelType === 'pro'} onChange={() => setModelType('pro')} style={{ display: 'none' }} />
                                <span style={{ fontWeight: 'bold', color: modelType === 'pro' ? '#e11d48' : labelColor }}>Na Banana Pro</span>
                                <span style={{ fontSize: '10px', color: '#6b7280' }}>(HD)</span>
                            </label>
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '13px', color: labelColor, marginBottom: '5px' }}>이미지 크기 (Ratio)</label>
                        <select 
                            value={selectedSizePreset} 
                            onChange={(e) => setSelectedSizePreset(Number(e.target.value))} 
                            style={{ width: '100%', padding: '10px', backgroundColor: '#111827', color: 'white', border: '1px solid #4b5563', borderRadius: '6px', fontSize: '13px' }}
                        >
                            {IMAGE_SIZE_PRESETS.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                    {preset.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button 
                        onClick={generateCoverArt}
                        disabled={loading}
                        style={{ 
                            width: '100%', padding: '15px', backgroundColor: '#10b981', color: 'white', border: 'none', 
                            borderRadius: '8px', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            marginTop: '10px'
                        }}
                    >
                        {loading ? 'Generating...' : <><span className="material-symbols-outlined">auto_awesome</span> 앨범 커버 생성</>}
                    </button>
                </div>
            </div>

            {/* Column 3: Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                 <h2 style={{ fontSize: '18px', borderBottom: '1px solid #374151', paddingBottom: '15px', margin: 0, color: '#10b981', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                    <span className="material-symbols-outlined">image</span> 미리보기 (Preview)
                 </h2>
                
                 <div style={{ 
                    width: '100%', 
                    aspectRatio: previewAspectRatio, 
                    backgroundColor: '#111827', 
                    borderRadius: '12px', border: '1px solid #374151', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    overflow: 'hidden', marginBottom: '10px', position: 'relative',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                    transition: 'aspect-ratio 0.3s ease',
                    maxHeight: 'calc(100vh - 300px)'
                }}>
                    {project.coverImage ? (
                        <>
                            <img src={project.coverImage} alt="Album Cover" style={{ width: '100%', height: '100%', objectFit: 'contain', maxWidth: '100%', maxHeight: '100%' }} />
                            <div style={{
                                position: 'absolute',
                                top: `${textOverlay.y}%`,
                                left: `${textOverlay.x}%`,
                                transform: 'translate(-50%, -50%)',
                                textAlign: 'center',
                                color: currentEffectStyle.color || textColor,
                                pointerEvents: 'none',
                                width: '100%',
                                ...currentEffectStyle
                            }}>
                                <div style={{ 
                                    fontFamily: fontType, 
                                    fontSize: `${textOverlay.size}px`, 
                                    fontWeight: 'bold',
                                    marginBottom: `${textOverlay.size * 0.2}px`
                                }}>
                                    {artTitle}
                                </div>
                                <div style={{ 
                                    fontFamily: fontType, 
                                    fontSize: `${textOverlay.size * 0.5}px`, 
                                    opacity: 0.9 
                                }}>
                                    {artistName}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ color: '#4b5563', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '64px' }}>image</span>
                            <span>No Image Generated</span>
                        </div>
                    )}
                </div>

                {project.coverImage && (
                    <button 
                        onClick={handleDownload}
                        style={{ 
                            width: '100%', padding: '12px', backgroundColor: '#374151', 
                            color: legibilityMode ? '#FFFFFF' : '#d1d5db', 
                            border: '1px solid #4b5563', borderRadius: '8px', 
                            cursor: 'pointer', fontWeight: 'bold', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            fontSize: '13px'
                        }}
                    >
                        <span className="material-symbols-outlined">download</span> 이미지 다운로드
                    </button>
                )}
            </div>
        </div>
    );
};

// --- TAB: Export ---
const MetadataDraftForm = ({ project, onCancel, legibilityMode }: any) => {
    const [artist, setArtist] = useState(project.djName || 'DJ Doberman');
    const [artistSamples, setArtistSamples] = useState<string[]>(['DJ Doberman']);
    const [generatedTags, setGeneratedTags] = useState<string>('');

    useEffect(() => {
        const saved = localStorage.getItem('suno_export_artists');
        if (saved) { setArtistSamples(JSON.parse(saved)); }
    }, []);

    useEffect(() => {
        const baseTags = [project.genre, project.subGenre, project.mood, 'NewMusic', 'SunoAI', 'AI_Music', project.vocalType];
        const formattedTags = baseTags.map(t => `#${t.replace(/\s+/g, '')}`).join(' ');
        setGeneratedTags(formattedTags);
    }, [project]);

    const saveArtistSamples = (list: string[]) => {
        setArtistSamples(list);
        localStorage.setItem('suno_export_artists', JSON.stringify(list));
    };

    const addArtist = () => {
        if (artist && !artistSamples.includes(artist)) {
            saveArtistSamples([...artistSamples, artist]);
        }
    };

    const removeArtist = (name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        saveArtistSamples(artistSamples.filter(a => a !== name));
    };

    const copyAll = () => {
        const text = `Title: ${project.title}\nArtist: ${artist}\n\n[Tags]\n${generatedTags}\n\n[Lyrics]\n${project.lyrics || '(No lyrics generated)'}`.trim();
        navigator.clipboard.writeText(text);
        alert('🎵 메타데이터 초안이 복사되었습니다!');
    };

    const labelColor = legibilityMode ? '#F9FAF8' : '#9ca3af';

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'left', backgroundColor: '#1f2937', color: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #374151', width: '100%' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827' }}>
                <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: legibilityMode ? 'bold' : 'normal' }}>
                    <span className="material-symbols-outlined" style={{ color: '#fbbf24' }}>description</span>
                    메타데이터 초안 생성
                </h2>
                <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
            <div style={{ padding: '30px' }}>
                <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                    <div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: labelColor, fontSize: '13px', marginBottom: '5px' }}>제목 (Title)</label>
                            <input type="text" value={project.title} readOnly style={{ width: '100%', padding: '10px', backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', color: labelColor, fontSize: '13px', marginBottom: '5px' }}>아티스트 (Artist)</label>
                            <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                                <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist Name" style={{ flex: 1, padding: '10px', backgroundColor: '#374151', border: '1px solid #4b5563', color: 'white', borderRadius: '6px', boxSizing: 'border-box' }} />
                                <button onClick={addArtist} style={{ padding: '0 12px', backgroundColor: '#374151', border: '1px solid #4b5563', color: '#10b981', borderRadius: '6px', cursor: 'pointer' }}>
                                    <Icon name="add" />
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {artistSamples.map((a, i) => (
                                    <div key={i} onClick={() => setArtist(a)} style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '12px', backgroundColor: '#111827', border: '1px solid #4b5563', color: legibilityMode ? '#FFFFFF' : '#d1d5db', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {a} <span onClick={(e) => removeArtist(a, e)} style={{ fontSize: '14px', color: '#ef4444', fontWeight: 'bold' }}>×</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ display: 'block', color: labelColor, fontSize: '13px', marginBottom: '5px' }}>가사 (Lyrics)</label>
                        <textarea value={project.lyrics || ''} readOnly style={{ flex: 1, padding: '10px', backgroundColor: '#374151', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '6px', resize: 'none', fontFamily: 'monospace', minHeight: '300px', boxSizing: 'border-box' }} />
                    </div>
                </div>
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button onClick={copyAll} style={{ padding: '12px 30px', backgroundColor: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="material-symbols-outlined">content_copy</span> 전체 복사 (Copy All)
                    </button>
                </div>
            </div>
        </div>
    );
};

const ExportTab = ({ project, onExportJSON, legibilityMode }: { project: Project, onExportJSON: () => void, legibilityMode: boolean }) => {
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  if (showMetadataForm) {
      return <MetadataDraftForm project={project} onCancel={() => setShowMetadataForm(false)} legibilityMode={legibilityMode} />;
  }
  const titleColor = legibilityMode ? '#FFFFFF' : '#f3f4f6';
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
      <h2 style={{ borderBottom: '1px solid #374151', paddingBottom: '15px', marginBottom: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: titleColor, fontWeight: legibilityMode ? 'bold' : 'normal' }}>
        <span className="material-symbols-outlined" style={{ color: '#fbbf24', fontSize: '28px' }}>publish</span>
        배포 및 내보내기 (Export)
      </h2>
      <div className="responsive-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div onClick={onExportJSON} style={{ backgroundColor: '#1f2937', padding: '50px 30px', borderRadius: '24px', border: '1px solid #374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <Icon name="download" />
              </div>
              <div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: 'white' }}>프로젝트 백업 (JSON)</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: legibilityMode ? '#E5E7EB' : '#9ca3af', lineHeight: '1.6' }}>프로젝트의 모든 데이터를 JSON으로 저장합니다.</p>
              </div>
          </div>
          <div onClick={() => setShowMetadataForm(true)} style={{ backgroundColor: '#1f2937', padding: '50px 30px', borderRadius: '24px', border: '1px solid #374151', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                  <Icon name="description" />
              </div>
              <div>
                  <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: 'white' }}>메타데이터 초안 생성</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: legibilityMode ? '#E5E7EB' : '#9ca3af', lineHeight: '1.6' }}>Suno 업로드를 위한 제목, 가사, 태그를 생성합니다.</p>
              </div>
          </div>
      </div>
    </div>
  );
};

// --- Studio Component ---
const Studio = ({ project, onUpdate, onBack, onExportJSON, legibilityMode }: { project: Project, onUpdate: (u: Partial<Project>) => void, onBack: () => void, onExportJSON: () => void, legibilityMode: boolean }) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('CONCEPT');
  const [showManual, setShowManual] = useState(false);

  const renderContent = () => {
    switch(activeTab) {
      case 'CONCEPT': return <ConceptTab project={project} onUpdate={onUpdate} legibilityMode={legibilityMode} />;
      case 'STRUCTURE': return <StructureTab project={project} onUpdate={onUpdate} legibilityMode={legibilityMode} />;
      case 'LYRICS': return <LyricsTab project={project} onUpdate={onUpdate} legibilityMode={legibilityMode} />;
      case 'SOUND': return <SoundTab project={project} onUpdate={onUpdate} legibilityMode={legibilityMode} />;
      case 'ART': return <ArtTab project={project} onUpdate={onUpdate} legibilityMode={legibilityMode} />;
      case 'EXPORT': return <ExportTab project={project} onExportJSON={onExportJSON} legibilityMode={legibilityMode} />;
      default: return <div>Unknown Tab</div>;
    }
  };

  return (
    <div className="studio-container">
      <nav className="sidebar-nav" style={{ width: '80px', backgroundColor: '#111827', borderRight: '1px solid #374151', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', gap: '20px' }}>
        <NavButton active={activeTab === 'CONCEPT'} onClick={() => setActiveTab('CONCEPT')} icon="lightbulb" label="기획" legibilityMode={legibilityMode} />
        <NavButton active={activeTab === 'STRUCTURE'} onClick={() => setActiveTab('STRUCTURE')} icon="view_timeline" label="구조" legibilityMode={legibilityMode} />
        <NavButton active={activeTab === 'LYRICS'} onClick={() => setActiveTab('LYRICS')} icon="lyrics" label="가사" legibilityMode={legibilityMode} />
        <NavButton active={activeTab === 'SOUND'} onClick={() => setActiveTab('SOUND')} icon="piano" label="사운드" legibilityMode={legibilityMode} />
        <NavButton active={activeTab === 'ART'} onClick={() => setActiveTab('ART')} icon="image" label="아트" legibilityMode={legibilityMode} />
        <NavButton active={activeTab === 'EXPORT'} onClick={() => setActiveTab('EXPORT')} icon="publish" label="배포" legibilityMode={legibilityMode} />
        <div className="sidebar-divider" style={{ height: '20px', borderBottom: '1px solid #374151', width: '50%', margin: '10px auto' }}></div>
        <NavButton active={showManual} onClick={() => setShowManual(true)} icon="menu_book" label="매뉴얼" legibilityMode={legibilityMode} />
      </nav>
      <div className="studio-main-content">
        {renderContent()}
      </div>
      {showManual && <ManualModal onClose={() => setShowManual(false)} />}
    </div>
  );
};

// --- Dashboard Component ---
const Dashboard = ({ projects, onCreate, onOpen, onDelete, onExport, legibilityMode }: any) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ genre: 'K-Pop', subGenre: 'Girl Crush', mood: 'Energetic & Powerful', title: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newProjectForm.title.trim()) return alert('제목을 입력하세요');
    onCreate(newProjectForm);
    setIsModalOpen(false);
    setNewProjectForm({ genre: 'K-Pop', subGenre: 'Girl Crush', mood: 'Energetic & Powerful', title: '' });
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === 'Custom') {
      setNewProjectForm({ ...newProjectForm, genre: selected, subGenre: '' });
    } else {
      const genreObj = GENRES.find(g => g.label === selected);
      setNewProjectForm({ 
        ...newProjectForm, 
        genre: selected, 
        subGenre: genreObj && genreObj.subgenres.length > 0 ? genreObj.subgenres[0] : '' 
      });
    }
  };

  const titleColor = legibilityMode ? '#FFFFFF' : '#f3f4f6';
  const labelColor = legibilityMode ? '#E5E7EB' : '#9ca3af';

  const selectedGenreObj = GENRES.find(g => g.label === newProjectForm.genre);

  return (
    <div style={{ padding: '40px', width: '100%', height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px', color: titleColor }}>Projects</h2>
            <p style={{ color: labelColor, margin: 0 }}>Manage your music productions and ideas</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} style={{ backgroundColor: '#e11d48', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(225, 29, 72, 0.2)' }}>
            <Icon name="add" /> New Project
          </button>
        </div>
        <div className="dashboard-projects" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
          <div onClick={() => setIsModalOpen(true)} style={{ backgroundColor: 'rgba(31, 41, 55, 0.4)', borderRadius: '16px', border: '2px dashed #4b5563', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: '320px', transition: 'all 0.2s' }}>
             <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#e11d48' }}>
                <Icon name="add" />
             </div>
             <span style={{ fontSize: '16px', fontWeight: 'bold', color: labelColor }}>Create New Project</span>
          </div>
          {projects.map((p: Project) => (
            <div key={p.id} onClick={() => onOpen(p.id)} style={{ backgroundColor: '#1f2937', borderRadius: '16px', border: '1px solid #374151', display: 'flex', flexDirection: 'column', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                <div style={{ height: '180px', width: '100%', position: 'relative', backgroundColor: '#111827' }}>
                    {p.coverImage ? <img src={p.coverImage} alt="cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' }}><span style={{ fontSize: '48px', opacity: 0.2 }}>🎵</span></div>}
                     <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px', zIndex: 10 }}>
                         <button onClick={(e) => { e.stopPropagation(); onExport(p); }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="download" /></button>
                         <button onClick={(e) => { e.stopPropagation(); setDeleteId(p.id); }} style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="close" /></button>
                    </div>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 12px 0', color: 'white' }}>{p.title || 'Untitled Project'}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', backgroundColor: '#374151', color: legibilityMode ? '#FFFFFF' : '#9ca3af', fontWeight: '500' }}>{p.genre}</span>
                        {p.subGenre && <span style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '12px', backgroundColor: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', border: '1px solid rgba(225, 29, 72, 0.2)', fontWeight: '500' }}>{p.subGenre}</span>}
                    </div>
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #374151', paddingTop: '15px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                        <span style={{ fontSize: '13px', color: '#818cf8', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>Open Studio <Icon name="arrow_forward" /></span>
                    </div>
                </div>
            </div>
          ))}
        </div>
      </div>
      {deleteId && <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}><div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '16px', border: '1px solid #374151', width: '320px', textAlign: 'center', maxWidth: '90vw' }}><h3 style={{ margin: '0 0 24px 0', color: 'white' }}>정말로 삭제하시겠습니까?</h3><div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}><button onClick={() => setDeleteId(null)} style={{ padding: '10px 20px', backgroundColor: '#374151', color: 'white', borderRadius: '8px' }}>취소</button><button onClick={() => { onDelete(deleteId); setDeleteId(null); }} style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', borderRadius: '8px' }}>삭제</button></div></div></div>}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: '#1f2937', padding: '30px', borderRadius: '16px', width: '500px', maxWidth: '90vw' }}>
                <h3 style={{ marginTop: 0, color: 'white' }}>Start New Project</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', margin: '20px 0' }}>
                    <div>
                        <label style={{ display: 'block', color: labelColor, fontSize: '13px', marginBottom: '5px' }}>Project Name</label>
                        <input type="text" value={newProjectForm.title} onChange={e => setNewProjectForm({...newProjectForm, title: e.target.value})} placeholder="Enter project name..." style={{ width: '100%', padding: '12px', backgroundColor: '#111827', border: '1px solid #374151', color: 'white', borderRadius: '8px', boxSizing: 'border-box' }} />
                    </div>
                    
                    <div className="responsive-grid-2" style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', color: labelColor, fontSize: '13px', marginBottom: '5px' }}>Genre</label>
                            <select value={newProjectForm.genre} onChange={handleGenreChange} style={{ width: '100%', padding: '12px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151', borderRadius: '8px' }}>
                                {GENRES.map(g => <option key={g.label} value={g.label}>{g.label}</option>)}
                            </select>
                        </div>
                        {selectedGenreObj && selectedGenreObj.subgenres.length > 0 && (
                            <div>
                                <label style={{ display: 'block', color: labelColor, fontSize: '13px', marginBottom: '5px' }}>Sub-Genre</label>
                                <select value={newProjectForm.subGenre} onChange={e => setNewProjectForm({...newProjectForm, subGenre: e.target.value})} style={{ width: '100%', padding: '12px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151', borderRadius: '8px' }}>
                                    {selectedGenreObj.subgenres.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', color: labelColor, fontSize: '13px', marginBottom: '5px' }}>Mood</label>
                        <select value={newProjectForm.mood} onChange={e => setNewProjectForm({...newProjectForm, mood: e.target.value})} style={{ width: '100%', padding: '12px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151', borderRadius: '8px' }}>
                            {MOODS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button onClick={() => setIsModalOpen(false)} style={{ padding: '10px 20px', background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleCreate} style={{ padding: '10px 24px', backgroundColor: '#e11d48', color: 'white', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Create Project</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const Header = ({ view, project, onBack, onSave, onImport, onRemix, legibilityMode, onToggleLegibility, onOpenKeyManager }: any) => {
    return (
        <div className="app-header" style={{ height: '60px', backgroundColor: '#111827', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', padding: '0 20px', justifyContent: 'space-between', boxSizing: 'border-box' }}>
            <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={onBack}>
                    <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#e11d48' }}>piano</span>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: legibilityMode ? '#FFFFFF' : 'white' }}>Suno Studio Pro V1.0</span>
                </div>
                {view === 'STUDIO' && project && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid #374151', paddingLeft: '15px', marginLeft: '5px' }}>
                        <span style={{ color: legibilityMode ? '#FFFFFF' : '#d1d5db', fontSize: '14px', fontWeight: 'bold' }}>{project.title}</span>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>/</span>
                        <span style={{ color: legibilityMode ? '#FFFFFF' : '#9ca3af', fontSize: '14px' }}>{project.genre}</span>
                    </div>
                )}
            </div>
            <div className="header-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Key Management Button */}
                <button 
                    onClick={onOpenKeyManager}
                    style={{ 
                        padding: '6px 12px', 
                        backgroundColor: '#374151', 
                        color: '#fbbf24', 
                        border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                    title="Manage API Key"
                >
                    <Icon name="key" />
                    Key
                </button>

                {/* Legibility Mode Toggle */}
                <button 
                    onClick={onToggleLegibility}
                    style={{ 
                        padding: '6px 12px', 
                        backgroundColor: legibilityMode ? '#fbbf24' : '#374151', 
                        color: legibilityMode ? '#000000' : '#FFFFFF', 
                        border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    <Icon name="contrast" />
                    {legibilityMode ? 'ON' : 'OFF'}
                </button>

                {view === 'DASHBOARD' && (
                    <>
                        <input type="file" id="import-json" style={{ display: 'none' }} accept=".json" onChange={onImport} />
                        <label htmlFor="import-json" style={{ padding: '8px 16px', backgroundColor: '#374151', color: '#d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon name="folder_open" />
                            <span className="sidebar-divider">Import</span>
                        </label>
                    </>
                )}
                {view === 'STUDIO' && (
                    <>
                        <button onClick={onRemix} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#818cf8', borderRadius: '6px', fontSize: '13px', border: '1px solid #818cf8', cursor: 'pointer' }}>Remix</button>
                        <button onClick={onSave} style={{ padding: '8px 16px', backgroundColor: '#374151', color: '#d1d5db', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', border: 'none' }}>Save</button>
                    </>
                )}
            </div>
        </div>
    );
};

const App = () => {
    const [view, setView] = useState<ViewState>('DASHBOARD');
    const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [showKeyManager, setShowKeyManager] = useState(true); // Start with key manager to check key
    const [legibilityMode, setLegibilityMode] = useState(() => {
        const saved = localStorage.getItem('suno_legibility_mode');
        return saved === 'true';
    });

    const toggleLegibility = () => {
        const newVal = !legibilityMode;
        setLegibilityMode(newVal);
        localStorage.setItem('suno_legibility_mode', String(newVal));
    };

    const handleCreateProject = (form: any) => {
        const newProject: Project = {
            id: Date.now().toString(),
            title: form.title,
            genre: form.genre,
            subGenre: form.subGenre,
            mood: form.mood,
            styleDescription: '',
            bpm: 0,
            key: '',
            createdAt: Date.now(),
            generatedTitles: [],
            structure: [],
            lyrics: '',
            sunoPrompt: '',
            instruments: GENRE_DEFAULTS[form.genre] || [],
            vocalType: 'Male'
        };
        const updated = [newProject, ...projects];
        setProjects(updated);
        localStorage.setItem('suno_projects', JSON.stringify(updated));
        setCurrentProjectId(newProject.id);
        setView('STUDIO');
    };

    const handleUpdateProject = (updates: Partial<Project>) => {
        if (!currentProjectId) return;
        const updated = projects.map(p => p.id === currentProjectId ? { ...p, ...updates } : p);
        setProjects(updated);
        localStorage.setItem('suno_projects', JSON.stringify(updated));
    };

    const handleDeleteProject = (id: string) => {
        const updated = projects.filter(p => p.id !== id);
        setProjects(updated);
        localStorage.setItem('suno_projects', JSON.stringify(updated));
    };

    const handleOpenProject = (id: string) => {
        setCurrentProjectId(id);
        setView('STUDIO');
    };

    const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (imported.id && imported.title) {
                    const newId = Date.now().toString();
                    const newProject = { ...imported, id: newId };
                    const updated = [newProject, ...projects];
                    setProjects(updated);
                    localStorage.setItem('suno_projects', JSON.stringify(updated));
                    alert('Project Imported Successfully!');
                }
            } catch (err) {
                alert('Invalid JSON file');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleExportProject = (p: Project) => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${p.title || 'project'}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleRemix = () => {
        if (!currentProjectId) return;
        const current = projects.find(p => p.id === currentProjectId);
        if (!current) return;
        const remix: Project = {
            ...current,
            id: Date.now().toString(),
            title: `${current.title} (Remix)`,
            createdAt: Date.now()
        };
        const updated = [remix, ...projects];
        setProjects(updated);
        localStorage.setItem('suno_projects', JSON.stringify(updated));
        setCurrentProjectId(remix.id);
        alert('Remix created!');
    };

    useEffect(() => {
        const saved = localStorage.getItem('suno_projects');
        if (saved) setProjects(JSON.parse(saved));
        
        // If API Key already exists and is tested, we can hide the manager
        const key = localStorage.getItem('suno_pro_api_key');
        if (key) setShowKeyManager(false);
    }, []);

    const activeProject = projects.find(p => p.id === currentProjectId);

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: legibilityMode ? "'Inter', sans-serif" : "'Inter', sans-serif", backgroundColor: '#111827', color: 'white' }}>
            <style dangerouslySetInnerHTML={{ __html: responsiveGlobalStyles }} />
            
            {showKeyManager && <ApiKeyManagerPopup onOpenApp={() => setShowKeyManager(false)} />}
            
            <Header 
                view={view} 
                project={activeProject} 
                onBack={() => setView('DASHBOARD')} 
                onSave={() => activeProject && handleExportProject(activeProject)}
                onImport={handleImportProject}
                onRemix={handleRemix}
                legibilityMode={legibilityMode}
                onToggleLegibility={toggleLegibility}
                onOpenKeyManager={() => setShowKeyManager(true)}
            />
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {view === 'DASHBOARD' && (
                    <Dashboard 
                        projects={projects} 
                        onCreate={handleCreateProject} 
                        onOpen={handleOpenProject} 
                        onDelete={handleDeleteProject}
                        onExport={handleExportProject}
                        legibilityMode={legibilityMode}
                    />
                )}
                {view === 'STUDIO' && activeProject && (
                    <Studio 
                        project={activeProject} 
                        onUpdate={handleUpdateProject} 
                        onBack={() => setView('DASHBOARD')} 
                        onExportJSON={() => handleExportProject(activeProject)}
                        legibilityMode={legibilityMode}
                    />
                )}
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
