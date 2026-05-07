import { useState, useEffect, useMemo, useRef } from 'react';
import data1 from './data/level1_5.json';
import data2 from './data/level6_10.json';
import randomData from './data/muhavare.json';
import './App.css';

const ALL_LEVELS = [...data1, ...data2];

const GAME_STATE = {
  MENU: 'MENU',
  LEVEL_MAP: 'LEVEL_MAP',
  PLAYING: 'PLAYING',
  BONUS: 'BONUS',
  PENALTY: 'PENALTY',
  STAGE_CLEAR: 'STAGE_CLEAR',
  GAME_OVER: 'GAME_OVER',
  SPOTLIGHT: 'SPOTLIGHT'
};

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// TTS Helpers
const speakHindi = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'hi-IN';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
};

const PENALTY_PAIRS = [
  ["पकड़े गए! नजर हटी, दुर्घटना घटी!", "Caught you! Eyes off, safety off!"],
  ["अरे ओ! कहाँ भाग रहे हो?", "Hey! Where are you running?"],
  ["मम्मी देख रही हैं! पढ़ाई पर ध्यान दो!", "Mummy is watching! Focus on your study!"],
  ["चीटिंग करना बुरी बात है, बेटा!", "Cheating is a bad habit, son!"],
  ["कहाँ चले? मुहावरे अभी खत्म नहीं हुए!", "Where to? The idioms are not finished yet!"],
  ["इधर-उधर मत देखो, फोकस करो!", "Don't look around, stay focused!"],
  ["लगता है किसी ने खिड़की के बाहर देख लिया!", "Looks like someone peeked out the window!"],
  ["अरे! गेम छोड़ कर सोशल मीडिया पर?", "Hey! Leaving the game for social media?"],
  ["वापस आओ! लेवल पूरा करना है!", "Come back! You need to finish the level!"],
  ["शातिर मत बनो, मुझे सब पता है!", "Don't be clever, I know everything!"],
  ["ओहो! ध्यान भटक गया?", "Oho! Lost your focus?"],
  ["गूगल पर जवाब ढूँढने गए क्या?", "Did you go to Google for the answer?"],
  ["जल्दी वापस आओ, मम्मी आने वाली हैं!", "Come back fast, Mummy is coming!"],
  ["हार मान ली क्या? वापस आओ!", "Giving up already? Come back!"],
  ["इतनी जल्दी थक गए? अभी तो बहुत बाकी है!", "Tired so soon? There is much left!"]
];

const RETURN_PAIRS = [
  ["पकड़े गए! अब चुप-चाप यहाँ बैठो और खेलो!", "Caught! Now sit here and play quietly!"],
  ["आखिर लौट ही आये! मम्मी को सब पता है!", "Back at last! Mummy knows everything!"],
  ["कहाँ सैर सपाटा करने गए थे? वापस फोकस करो!", "Where were you wandering? Focus back!"],
  ["शर्म नहीं आती? बीच में छोड़ के भाग गए!", "No shame? You ran away in the middle!"],
  ["देख लो, मैंने सब रिकॉर्ड कर लिया है!", "Look, I have recorded everything!"],
  ["वापस आ गए? चलो, अब जवाब दो!", "Back now? Come on, give the answer!"],
  ["ज्यादा चालाक मत बनो, मेरी नजर तुम पर है!", "Don't be too smart, I'm watching you!"],
  ["अरे, आप यहीं हैं? मुझे लगा कहीं और निकल गए!", "Oh, you are here? I thought you were gone!"],
  ["मम्मी आ रही हैं, जल्दी से अपना स्कोर बढ़ाओ!", "Mummy is coming, raise your score quickly!"],
  ["वापस आने के लिए शुक्रिया, लेकिन अगली बार मत जाना!", "Thanks for coming back, but don't leave next time!"]
];

const playPenaltyBuzzer = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, audioCtx.currentTime); 
    oscillator.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.8);
    gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.8);
  } catch (e) { console.warn(e); }
};

const speakSentence = (isReturn = false) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  
  if (!isReturn) playPenaltyBuzzer();

  const voices = window.speechSynthesis.getVoices();
  const hasHindi = voices.some(v => v.lang.toLowerCase().includes('hi'));
  
  const pairList = isReturn ? RETURN_PAIRS : PENALTY_PAIRS;
  const pair = pairList[Math.floor(Math.random() * pairList.length)];
  
  const msg = hasHindi ? pair[0] : pair[1];
  const utterance = new SpeechSynthesisUtterance(msg);
  utterance.lang = hasHindi ? 'hi-IN' : 'en-US';
  utterance.rate = 1.0;
  utterance.volume = 1.0; 
  window.speechSynthesis.speak(utterance);
};

function App() {
  const [gameState, setGameState] = useState(GAME_STATE.MENU);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [carriedBonusLives, setCarriedBonusLives] = useState(0);

  const stateRef = useRef(gameState);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const [currentLevelObj, setCurrentLevelObj] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [bonusLivesWon, setBonusLivesWon] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [spotlightItem, setSpotlightItem] = useState(null);
  const [spotlightEnglish, setSpotlightEnglish] = useState(false);

  const isPlayingOrBonus = gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.BONUS;
  const activeQuestionList = isPlayingOrBonus ? (gameState === GAME_STATE.BONUS ? currentLevelObj?.bonus : currentLevelObj?.regular) : null;
  const currentData = activeQuestionList ? activeQuestionList[qIndex] : null;

  const shuffledOptions = useMemo(() => {
    if (!currentData || !currentData.options) return [];
    return shuffleArray(currentData.options);
  }, [currentData]);

  useEffect(() => {
    const savedLevel = localStorage.getItem('muhavara_unlocked_level');
    const savedLives = localStorage.getItem('muhavara_bonus_lives');
    if (savedLevel) setUnlockedLevel(parseInt(savedLevel));
    if (savedLives) setCarriedBonusLives(parseInt(savedLives));
  }, []);

  const popupSuspend = useRef(false);
  const isCurrentlyFocused = useRef(true);

  // Visibility and Focus tracking
  useEffect(() => {
    const triggerLost = (reason) => {
      if (!isCurrentlyFocused.current) return;
      isCurrentlyFocused.current = false;
      
      if (popupSuspend.current) return;

      if (stateRef.current === GAME_STATE.PLAYING || stateRef.current === GAME_STATE.BONUS) {
        try {
          speakSentence(false);
        } catch (e) { console.error(e); }
        setGameState(GAME_STATE.PENALTY);
        setHearts(prev => Math.max(0, prev - 1));
      }
    };

    const triggerGained = (reason) => {
      if (isCurrentlyFocused.current) return;
      isCurrentlyFocused.current = true;
      if (popupSuspend.current) return;
      
      if (stateRef.current === GAME_STATE.PENALTY) {
        try {
          speakSentence(true);
        } catch (e) { console.error(e); }
      }
    };

    const handleVisibility = () => {
      if (document.hidden) triggerLost("visibility");
      else triggerGained("visibility");
    };

    const handleBlur = () => triggerLost("blur");
    const handleFocus = () => triggerGained("focus");
    const handleMouseLeave = () => triggerLost("mouseleave");
    const handleMouseEnter = () => triggerGained("mouseenter");

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    const poll = setInterval(() => {
      if (document.hidden || !document.hasFocus()) triggerLost("polling");
      else {
        if (!isCurrentlyFocused.current && !document.hidden && document.hasFocus()) {
          triggerGained("polling-return");
        }
      }
    }, 150); // Balanced 150ms for performance

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      clearInterval(poll);
    };
  }, []);

  const kickstartAudio = () => {
    // Unlocks AudioContext for the buzzer
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    // Unlocks TTS engine with a silent utterance
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const s = new SpeechSynthesisUtterance("");
      s.volume = 0;
      window.speechSynthesis.speak(s);
    }
  };

  const goLevelMap = () => setGameState(GAME_STATE.LEVEL_MAP);

  const resetProgress = () => {
    if (window.confirm("Are you sure you want to erase all progress and start over from Level 1?")) {
      localStorage.removeItem('muhavara_unlocked_level');
      localStorage.removeItem('muhavara_bonus_lives');
      setUnlockedLevel(1);
      setCarriedBonusLives(0);
    }
  };

  const quitToMap = () => {
    console.log("Back to Map clicked");
    setShowExitConfirm(true);
    popupSuspend.current = true;
  };

  const confirmQuit = () => {
    console.log("Confirmed, going to level map");
    setShowExitConfirm(false);
    setGameState(GAME_STATE.LEVEL_MAP);
    setTimeout(() => { popupSuspend.current = false; }, 500);
  };

  const cancelQuit = () => {
    setShowExitConfirm(false);
    setTimeout(() => { popupSuspend.current = false; }, 500);
  };

  const startLevel = (levelId) => {
    const lvl = ALL_LEVELS.find(l => l.levelId === levelId);
    setCurrentLevelObj(lvl);
    setGameState(GAME_STATE.PLAYING);
    setQIndex(0);
    setCorrectCount(0);
    setBonusLivesWon(0);
    setHearts(3 + carriedBonusLives); // Base 3 lives + carried bonuses
    setCarriedBonusLives(0); // consume them
    localStorage.setItem('muhavara_bonus_lives', 0);
    setSelectedOption(null);
    setShowEnglish(false);
  };

  const handleOptionClick = (option, isBonus) => {
    if (selectedOption) return; // Prevent multiple clicks
    setSelectedOption(option);
    
    const questionList = isBonus ? currentLevelObj.bonus : currentLevelObj.regular;
    const currentData = questionList[qIndex];
    const isCorrect = option === currentData.answer;

    if (isCorrect) {
      if (!isBonus) setCorrectCount(c => c + 1);
      else setBonusLivesWon(b => b + 1);
    } else {
      setHearts(h => h - 1);
    }
  };

  const handleNextQuestion = (isBonus) => {
    // If hearts hit 0 during the last question, we Game Over before moving forward
    if (hearts <= 0) {
      setGameState(GAME_STATE.GAME_OVER);
      return;
    }

    const questionList = isBonus ? currentLevelObj.bonus : currentLevelObj.regular;
    
    // Progress to next question
    if (qIndex < questionList.length - 1) {
      setQIndex(q => q + 1);
      setSelectedOption(null);
      setShowEnglish(false);
    } else {
      // Finished the block
      if (!isBonus) {
        // Did we qualify for bonus?
        if (correctCount >= 9) {
          setGameState(GAME_STATE.BONUS);
          setQIndex(0);
          setSelectedOption(null);
          setShowEnglish(false);
        } else {
          handleLevelComplete();
        }
      } else {
        // Finished Bonus Round
        handleLevelComplete(bonusLivesWon);
      }
    }
  };

  const handleLevelComplete = (earnedBonusLives = bonusLivesWon) => {
    const nextLevel = currentLevelObj.levelId + 1;
    if (nextLevel > unlockedLevel && nextLevel <= 10) {
      setUnlockedLevel(nextLevel);
      localStorage.setItem('muhavara_unlocked_level', nextLevel);
    }
    setCarriedBonusLives(earnedBonusLives);
    localStorage.setItem('muhavara_bonus_lives', earnedBonusLives);
    
    setGameState(GAME_STATE.STAGE_CLEAR);
  };

  const openSpotlight = () => {
    const randomItem = randomData[Math.floor(Math.random() * randomData.length)];
    setSpotlightItem(randomItem);
    setSpotlightEnglish(false);
    setGameState(GAME_STATE.SPOTLIGHT);
  };

  const refreshSpotlight = () => {
    const currentId = spotlightItem?.id;
    let newItem = spotlightItem;
    while (newItem.id === currentId) {
      newItem = randomData[Math.floor(Math.random() * randomData.length)];
    }
    setSpotlightItem(newItem);
    setSpotlightEnglish(false);
  };

  // UI Renderers
  const renderQuestionBlock = (isBonus) => {
    if (!currentData) return null;

    return (
      <div className="game-screen">
        <div className="level-badge" style={{ backgroundColor: isBonus ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', color: isBonus ? '#fff' : 'var(--primary-color)' }}>
          {isBonus ? 'BONUS ROUND ⭐' : currentLevelObj.title} - Q{qIndex + 1}
        </div>
        
        <div className={`flip-card ${selectedOption !== null ? 'flipped' : ''}`}>
          <div className="flip-card-inner">
            <div className="flip-card-front">
              <div className="story-card">
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                  <strong>📖 Context:</strong>
                  <button onClick={() => speakHindi(currentData.story_hindi)} className="speaker-icon" title="Read Out Loud">🔊</button>
                </div>
                
                <p className={showEnglish ? "" : "hindi-text"} style={{ fontSize: showEnglish ? '18px' : '20px' }}>
                  {showEnglish ? currentData.story_english : currentData.story_hindi}
                </p>
                
                <button className="translate-toggle" onClick={() => setShowEnglish(!showEnglish)}>
                  Swap to {showEnglish ? "Hindi" : "English"}
                </button>
              </div>
            </div>
            
            <div className="flip-card-back">
              <div className={selectedOption === currentData.answer ? "meaning-box" : "meaning-box wrong-box"}>
                <strong>{selectedOption === currentData.answer ? "Correct!" : "Oops! Incorrect."} </strong><br/>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '1.2rem', display: 'block' }}>
                    <strong>{currentData.answer}</strong>
                  </span>
                  <button onClick={() => speakHindi(currentData.answer)} className="speaker-icon" style={{ fontSize: '1.2rem' }} title="Pronounce">🔊</button>
                </div>
                <p style={{ marginTop: '12px', color: 'var(--text-main)', opacity: 0.9 }}>
                  Meaning: {currentData.actual_meaning}
                </p>
                {currentData.origin_hindi && (
                  <div className="origin-section" style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', textAlign: 'left' }}>
                    <label style={{ fontSize: '10px', color: 'var(--primary-color)', fontWeight: '800' }}>🔍 INSIDE THE IDIOM:</label>
                    <p style={{ fontSize: '14px', fontStyle: 'italic', opacity: 0.8 }}>
                      {showEnglish ? currentData.origin_english : currentData.origin_hindi}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="question-prompt">
          What's the right Muhavara?
        </div>

        <div className="options-grid">
          {shuffledOptions.map((opt, i) => {
            let btnClass = "option-btn";
            if (selectedOption !== null) {
              if (opt === currentData.answer) btnClass += " correct";
              else if (opt === selectedOption) btnClass += " wrong";
            }
            return (
              <div key={i} className="option-wrapper" style={{ display: 'flex', gap: '8px' }}>
                <button className="speaker-icon" onClick={() => speakHindi(opt)} style={{ flexShrink: 0 }}>🔊</button>
                <button className={btnClass} style={{ flexGrow: 1 }} onClick={() => handleOptionClick(opt, isBonus)} disabled={selectedOption !== null}>
                  <span className="hindi-text">{opt}</span>
                  {selectedOption !== null && opt === currentData.answer && " ✅"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Persistent Next Button */}
        {selectedOption !== null && (
          <div className="meaning-container slide-up-anim">
            <button className="action-btn" onClick={() => handleNextQuestion(isBonus)} style={{ backgroundColor: 'var(--primary-color)', color: '#000' }}>
              {hearts <= 0 ? "You Failed! Proceed 👉" : "Next Question 👉"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Universal Header */}
      {(gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.BONUS || gameState === GAME_STATE.PENALTY) && (
        <header className="header" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="hearts" style={{ marginBottom: '8px' }}>
              {/* Compute initial hearts based on what we started the level with (3 base + carried bonus) */}
              {Array.from({ length: Math.max(3, hearts) }).map((_, i) => (
                <span key={i} style={{ opacity: i < hearts ? 1 : 0.3 }}>{i >= 3 ? '⭐' : '❤️'}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={quitToMap} 
                className="back-map-btn"
                style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  color: 'var(--text-muted)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  borderRadius: '8px',
                  padding: '6px 12px',
                  cursor: 'pointer', 
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}
              >
                🔙 Back to Map
              </button>
            </div>
          </div>
          <div className="score" style={{ textAlign: 'right' }}>
            {gameState === GAME_STATE.PLAYING && `Correct: ${correctCount}/10`}<br/>
            {gameState === GAME_STATE.BONUS && `Bonus Lives: ${bonusLivesWon}`}
          </div>
        </header>
      )}

      {/* Main Menu */}
      {gameState === GAME_STATE.MENU && (
        <div className="menu-screen">
          <div className="logo-icon">🏏</div>
          <h1 className="title-main">जब हम पिछली बार 10 थे</h1>
          <p className="subtitle">10-Level Ultimate Campaign</p>
          <button className="play-btn" onClick={() => { kickstartAudio(); goLevelMap(); }}>
            {unlockedLevel > 1 ? "Continue Journey" : "Start Journey"}
          </button>
          <button onClick={resetProgress} style={{ marginTop: '32px', background: 'transparent', color: 'var(--danger-color)', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '15px' }}>
            Reset Campaign Progress
          </button>
        </div>
      )}

      {/* Level Map Grid */}
      {gameState === GAME_STATE.LEVEL_MAP && (
        <div className="menu-screen" style={{ justifyContent: 'flex-start' }}>
          <h2 style={{ marginBottom: '24px' }}>Campaign Map</h2>
          
          <div className="spotlight-teaser" onClick={openSpotlight}>
            <div className="teaser-content">
              <span className="teaser-badge">SPOTLIGHT ✨</span>
              <h3>Surprise Muhavara</h3>
              <p>Discover a random idiom!</p>
            </div>
            <div className="teaser-icon">🎁</div>
          </div>

          <div className="level-grid">
            {ALL_LEVELS.map(lvl => {
              const isUnlocked = lvl.levelId <= unlockedLevel;
              const isCompleted = lvl.levelId < unlockedLevel;
              
              // Define vibrant colors for levels
              let accentColor = 'var(--lvl-1-2)';
              if (lvl.levelId > 2) accentColor = 'var(--lvl-3-4)';
              if (lvl.levelId > 4) accentColor = 'var(--lvl-5-6)';
              if (lvl.levelId > 6) accentColor = 'var(--lvl-7-8)';
              if (lvl.levelId > 8) accentColor = 'var(--lvl-9-10)';

              return (
                <button 
                  key={lvl.levelId} 
                  className={`level-btn ${isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => { if (isUnlocked) { kickstartAudio(); startLevel(lvl.levelId); } }}
                  disabled={!isUnlocked}
                  style={isUnlocked ? { 
                    borderLeft: `6px solid ${accentColor}`,
                    background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`
                  } : {}}
                >
                  <div className="level-number" style={isUnlocked ? { 
                    background: `linear-gradient(to bottom, #fff, ${accentColor})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  } : {}}>{lvl.levelId}</div>
                  <div className="level-title-sm" style={isUnlocked ? { color: accentColor } : {}}>
                    {isCompleted ? "⭐ Completed" : isUnlocked ? lvl.title : "Locked 🔒"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Game Screens */}
      {gameState === GAME_STATE.PLAYING && renderQuestionBlock(false)}
      {gameState === GAME_STATE.BONUS && renderQuestionBlock(true)}

      {/* Interrupts & Overlays */}
      {gameState === GAME_STATE.PENALTY && (
        <div className="overlay-screen">
          <div className="emoji-giant">🤦</div>
          <h2 className="overlay-title text-danger">FOCUS LOST!</h2>
          <p className="overlay-desc">Mummy caught you looking away! You lost a heart.</p>
          <button className="action-btn" onClick={() => {
            if (hearts <= 0) setGameState(GAME_STATE.GAME_OVER);
            else setGameState(currentLevelObj ? GAME_STATE.PLAYING : GAME_STATE.LEVEL_MAP);
          }}>
            {hearts <= 0 ? "Game Over" : "Apologize & Resume"}
          </button>
        </div>
      )}

      {gameState === GAME_STATE.GAME_OVER && (
        <div className="overlay-screen">
          <div className="emoji-giant">😭</div>
          <h2 className="overlay-title text-danger">LEVEL FAILED</h2>
          <p className="overlay-desc">You ran out of hearts.</p>
          <button className="action-btn" onClick={goLevelMap}>Back to Map</button>
        </div>
      )}

      {gameState === GAME_STATE.STAGE_CLEAR && (
        <div className="overlay-screen">
          <div className="emoji-giant">🏅</div>
          <h2 className="overlay-title text-success">LEVEL COMPLETE!</h2>
          <p className="overlay-desc">
            You scored {correctCount}/10.<br/>
            {bonusLivesWon > 0 && <span>You also banked <strong>{bonusLivesWon} Extra Lives (⭐)</strong> for the next level!</span>}
            {correctCount < 9 && <span>(Score 9/10 next time to unlock the Bonus Round!)</span>}
          </p>
          <button className="action-btn" onClick={goLevelMap}>Continue to Map</button>
        </div>
      )}

      {/* Spotlight View */}
      {gameState === GAME_STATE.SPOTLIGHT && spotlightItem && (
        <div className="overlay-screen spotlight-screen">
          <header className="header" style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', border: 'none' }}>
            <button className="back-map-btn" onClick={goLevelMap}>🔙 Map</button>
          </header>

          <div className="spotlight-card slide-up-anim">
            <div className="spotlight-header">
              <span className="teaser-badge">FEATURED GEM 💎</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <h1 className="hindi-text" style={{ margin: 0 }}>{spotlightItem.muhavara}</h1>
                <button onClick={() => speakHindi(spotlightItem.muhavara)} className="speaker-icon" style={{ fontSize: '1.8rem' }} title="Pronounce">🔊</button>
              </div>
            </div>

            <div className="spotlight-body">
              <div className="detail-item">
                <label>Meaning:</label>
                <p>{spotlightItem.actual_meaning}</p>
              </div>

              {spotlightItem.origin_hindi && (
                <div className="detail-item origin-box">
                  <label>🔍 Inside the Idiom:</label>
                  <p className={spotlightEnglish ? "" : "hindi-text"} style={{ fontSize: '14px', fontStyle: 'italic' }}>
                    {spotlightEnglish ? spotlightItem.origin_english : spotlightItem.origin_hindi}
                  </p>
                </div>
              )}

              <div className="detail-item glass-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>Usage & Context:</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="speaker-icon sm" onClick={() => speakHindi(spotlightEnglish ? spotlightItem.story_english : spotlightItem.story_hindi)}>🔊</button>
                    <button className="translate-toggle sm" onClick={() => setSpotlightEnglish(!spotlightEnglish)}>
                      {spotlightEnglish ? "HI" : "EN"}
                    </button>
                  </div>
                </div>
                <p className={spotlightEnglish ? "" : "hindi-text"}>
                  {spotlightEnglish ? spotlightItem.story_english : spotlightItem.story_hindi}
                </p>
              </div>
            </div>

            <div className="spotlight-footer">
              <button className="action-btn" onClick={refreshSpotlight} style={{ backgroundColor: 'var(--primary-color)', color: '#000' }}>
                Roll Another! 🎲
              </button>
              <button className="action-btn" onClick={goLevelMap} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', marginTop: '8px' }}>
                Back to Journey
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {showExitConfirm && (
        <div className="overlay-screen" style={{ backgroundColor: 'rgba(11, 15, 26, 0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="emoji-giant">🗺️?</div>
          <h2 className="overlay-title">Quit to Map?</h2>
          <p className="overlay-desc">Your progress in this level will be lost!</p>
          <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '300px' }}>
            <button className="action-btn" onClick={cancelQuit} style={{ background: 'rgba(255,255,255,0.1)' }}>No, Stay</button>
            <button className="action-btn" onClick={confirmQuit} style={{ backgroundColor: 'var(--danger-color)', color: '#fff' }}>Yes, Quit</button>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
