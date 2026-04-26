import { useState, useEffect, useMemo, useRef } from 'react';
import { useFocusPenalty } from './hooks/useFocusPenalty';
import data1 from './data/level1_5.json';
import data2 from './data/level6_10.json';
import './App.css';

const ALL_LEVELS = [...data1, ...data2];

const GAME_STATE = {
  MENU: 'MENU',
  LEVEL_MAP: 'LEVEL_MAP',
  PLAYING: 'PLAYING',
  BONUS: 'BONUS',
  PENALTY: 'PENALTY',
  STAGE_CLEAR: 'STAGE_CLEAR',
  GAME_OVER: 'GAME_OVER'
};

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

// TTS Helper
const speakHindi = (text) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'hi-IN';
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
};

function App() {
  const [gameState, setGameState] = useState(GAME_STATE.MENU);
  const [unlockedLevel, setUnlockedLevel] = useState(1);
  const [carriedBonusLives, setCarriedBonusLives] = useState(0);

  // Active level state
  const [currentLevelObj, setCurrentLevelObj] = useState(null);
  const [qIndex, setQIndex] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [correctCount, setCorrectCount] = useState(0);
  const [bonusLivesWon, setBonusLivesWon] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState(null);
  const [showEnglish, setShowEnglish] = useState(false);

  // Safe Top-Level Hook for shuffling to prevent React conditional render crashes
  const isPlayingOrBonus = gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.BONUS;
  const activeQuestionList = isPlayingOrBonus ? (gameState === GAME_STATE.BONUS ? currentLevelObj?.bonus : currentLevelObj?.regular) : null;
  const currentData = activeQuestionList ? activeQuestionList[qIndex] : null;

  const shuffledOptions = useMemo(() => {
    if (!currentData || !currentData.options) return [];
    return shuffleArray(currentData.options);
  }, [currentData]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedLevel = localStorage.getItem('muhavara_unlocked_level');
    const savedLives = localStorage.getItem('muhavara_bonus_lives');
    if (savedLevel) setUnlockedLevel(parseInt(savedLevel));
    if (savedLives) setCarriedBonusLives(parseInt(savedLives));
  }, []);

  const popupSuspend = useRef(false);

  // Hook handles visibility drop
  useFocusPenalty(() => {
    if (popupSuspend.current) return;
    if (gameState === GAME_STATE.PLAYING || gameState === GAME_STATE.BONUS) {
      setGameState(GAME_STATE.PENALTY);
      setHearts(prev => Math.max(0, prev - 1));
    }
  });

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
    popupSuspend.current = true;
    const answer = window.confirm("Quit to the campaign map? Your progress in this level will be lost!");
    setTimeout(() => { popupSuspend.current = false; }, 300);

    if (answer) {
      goLevelMap();
    }
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

  // UI Renderers
  const renderQuestionBlock = (isBonus) => {
    if (!currentData) return null;

    return (
      <div className="game-screen">
        <div className="level-badge" style={{ backgroundColor: isBonus ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', color: isBonus ? '#fff' : 'var(--primary-color)' }}>
          {isBonus ? 'BONUS ROUND ⭐' : currentLevelObj.title} - Q{qIndex + 1}
        </div>
        
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

        {/* Persistent Meaning & Next Button */}
        {selectedOption !== null && (
          <div className="meaning-container slide-up-anim">
            <div className={selectedOption === currentData.answer ? "meaning-box" : "meaning-box wrong-box"} style={{ marginBottom: '12px' }}>
              <strong>{selectedOption === currentData.answer ? "Correct!" : "Oops! The correct answer was " + currentData.answer + "."} </strong><br/>
              Meaning: {currentData.actual_meaning}
            </div>
            
            <button className="action-btn" onClick={() => handleNextQuestion(isBonus)} style={{ backgroundColor: 'var(--primary-color)' }}>
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
              <button onClick={quitToMap} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '14px', padding: 0 }}>
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
          <button className="play-btn" onClick={goLevelMap}>
            {unlockedLevel > 1 ? "Continue Journey" : "Start Journey"}
          </button>
          {unlockedLevel > 1 && (
            <button onClick={resetProgress} style={{ marginTop: '32px', background: 'transparent', color: 'var(--danger-color)', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '15px' }}>
              Reset Campaign Progress
            </button>
          )}
        </div>
      )}

      {/* Level Map Grid */}
      {gameState === GAME_STATE.LEVEL_MAP && (
        <div className="menu-screen" style={{ justifyContent: 'flex-start' }}>
          <h2 style={{ marginBottom: '24px' }}>Campaign Map</h2>
          <div className="level-grid">
            {ALL_LEVELS.map(lvl => {
              const isUnlocked = lvl.levelId <= unlockedLevel;
              const isCompleted = lvl.levelId < unlockedLevel; // If it's unlocked beyond it, it's completed
              return (
                <button 
                  key={lvl.levelId} 
                  className={`level-btn ${isUnlocked ? 'unlocked' : 'locked'}`}
                  onClick={() => isUnlocked && startLevel(lvl.levelId)}
                  disabled={!isUnlocked}
                >
                  <div className="level-number">{lvl.levelId}</div>
                  <div className="level-title-sm">
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
          <div className="chappal-animation">🩴</div>
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
    </div>
  );
}

export default App;
