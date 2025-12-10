import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, BookOpen, Edit3, Check, X, RotateCcw, Shuffle, Eye, EyeOff, Trash2, Filter, Settings, Award } from 'lucide-react';

const WordMaster = () => {
  // --- State Management ---
  const [rawWords, setRawWords] = useState([]);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'unknown'
  const [studyMode, setStudyMode] = useState('flashcard'); // 'flashcard', 'dictation', 'list'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [flashcardDirection, setFlashcardDirection] = useState('en-zh'); // 'en-zh' (Show EN first), 'zh-en' (Show ZH first)
  const [dictationInput, setDictationInput] = useState('');
  const [dictationResult, setDictationResult] = useState(null); // null, 'correct', 'incorrect'
  const [showAnswerInDictation, setShowAnswerInDictation] = useState(false);
  
  // Input ref for file upload
  const fileInputRef = useRef(null);

  // --- Effects ---

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wordMasterData');
    if (saved) {
      try {
        setRawWords(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  // Save to LocalStorage whenever words change
  useEffect(() => {
    if (rawWords.length > 0) {
      localStorage.setItem('wordMasterData', JSON.stringify(rawWords));
    }
  }, [rawWords]);

  // --- Computed Data ---

  const activeWords = useMemo(() => {
    let list = rawWords;
    if (filterMode === 'unknown') {
      list = rawWords.filter(w => w.status === 'unknown');
    }
    return list;
  }, [rawWords, filterMode]);

  const currentWord = activeWords[currentIndex];

  const stats = useMemo(() => {
    const total = rawWords.length;
    const familiar = rawWords.filter(w => w.status === 'familiar').length;
    const unknown = rawWords.filter(w => w.status === 'unknown').length;
    const unrated = rawWords.filter(w => !w.status).length;
    return { total, familiar, unknown, unrated };
  }, [rawWords]);

  // --- Handlers ---

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const parsedWords = lines
        .map((line, index) => {
          // Handle potential carriage returns and empty lines
          const cleanLine = line.trim();
          if (!cleanLine) return null;
          
          // Split by first semicolon found
          const parts = cleanLine.split(';');
          if (parts.length < 2) return null;

          const term = parts[0].trim();
          const definition = parts.slice(1).join(';').trim(); // Join rest in case definition has semicolon

          return {
            id: Date.now() + index,
            term,
            definition,
            status: 'unknown', // Default to unknown
            attempts: 0,
            correct: 0
          };
        })
        .filter(Boolean);

      if (parsedWords.length > 0) {
        setRawWords(parsedWords);
        setCurrentIndex(0);
        setFilterMode('all');
        alert(`成功导入 ${parsedWords.length} 个单词！`);
      } else {
        alert("未能识别文件内容，请检查格式是否为：单词;中文释义");
      }
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };

  const updateWordStatus = (id, newStatus) => {
    setRawWords(prev => prev.map(w => w.id === id ? { ...w, status: newStatus } : w));
    nextCard();
  };

  const nextCard = () => {
    setIsFlipped(false);
    setDictationResult(null);
    setDictationInput('');
    setShowAnswerInDictation(false);
    
    if (currentIndex < activeWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Loop back or finish
      // For now, loop back to start to keep studying
      setCurrentIndex(0);
    }
  };

  const prevCard = () => {
    setIsFlipped(false);
    setDictationResult(null);
    setDictationInput('');
    setShowAnswerInDictation(false);
    
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(activeWords.length - 1);
    }
  };

  const shuffleCards = () => {
    const shuffled = [...rawWords].sort(() => Math.random() - 0.5);
    setRawWords(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const resetProgress = () => {
    if (confirm('确定要重置所有学习进度吗？所有单词将变为“陌生”状态。')) {
      setRawWords(prev => prev.map(w => ({ ...w, status: 'unknown' })));
      setCurrentIndex(0);
    }
  };

  const clearAllData = () => {
    if (confirm('确定要清空所有数据吗？你需要重新上传文件。')) {
      setRawWords([]);
      localStorage.removeItem('wordMasterData');
    }
  };

  const checkDictation = () => {
    if (!currentWord) return;
    const inputClean = dictationInput.trim().toLowerCase();
    const targetClean = currentWord.term.trim().toLowerCase();

    if (inputClean === targetClean) {
      setDictationResult('correct');
      // Auto-mark as familiar if correct? Maybe user decides.
    } else {
      setDictationResult('incorrect');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (dictationResult === 'correct') {
        nextCard();
      } else {
        checkDictation();
      }
    }
  };

  // --- Render Helpers ---

  if (rawWords.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="text-indigo-600 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">单词背诵助手</h1>
          <p className="text-gray-500 mb-8">
            上传你的单词文本文件 (txt) 开始学习。<br />
            <span className="text-xs text-gray-400">格式示例：apple;苹果 (每行一个)</span>
          </p>
          
          <input
            type="file"
            accept=".txt"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            上传单词文件
          </button>
        </div>
      </div>
    );
  }

  // --- Main UI ---

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-2xl mx-auto shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="bg-white px-4 py-4 shadow-sm z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="font-bold text-xl text-gray-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            WordMaster
          </h1>
          <div className="flex gap-2">
            <button onClick={shuffleCards} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full" title="打乱顺序">
              <Shuffle className="w-5 h-5" />
            </button>
            <button onClick={clearAllData} className="p-2 text-red-400 hover:bg-red-50 rounded-full" title="清空数据">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-green-50 p-2 rounded-lg text-center">
            <span className="block text-xs text-green-600 font-bold uppercase">熟悉</span>
            <span className="text-lg font-bold text-green-700">{stats.familiar}</span>
          </div>
          <div className="bg-red-50 p-2 rounded-lg text-center">
            <span className="block text-xs text-red-600 font-bold uppercase">陌生</span>
            <span className="text-lg font-bold text-red-700">{stats.unknown}</span>
          </div>
          <div className="bg-blue-50 p-2 rounded-lg text-center">
            <span className="block text-xs text-blue-600 font-bold uppercase">总计</span>
            <span className="text-lg font-bold text-blue-700">{stats.total}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Mode Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-lg flex-1">
            <button
              onClick={() => setStudyMode('flashcard')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                studyMode === 'flashcard' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              翻卡
            </button>
            <button
              onClick={() => setStudyMode('dictation')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                studyMode === 'dictation' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              默写
            </button>
            <button
              onClick={() => setStudyMode('list')}
              className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                studyMode === 'list' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              列表
            </button>
          </div>

          {/* Filter Switcher */}
          <button
            onClick={() => {
              setFilterMode(prev => prev === 'all' ? 'unknown' : 'all');
              setCurrentIndex(0);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 border ${
              filterMode === 'unknown' 
                ? 'bg-red-50 border-red-200 text-red-600' 
                : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            {filterMode === 'all' ? '复习全部' : '只看陌生'}
          </button>
        </div>
      </header>

      {/* Main Study Area */}
      <main className="flex-1 overflow-y-auto p-4 flex flex-col">
        {activeWords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Award className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg">没有需要复习的单词！</p>
            {filterMode === 'unknown' && (
              <button 
                onClick={() => setFilterMode('all')}
                className="mt-4 text-indigo-600 hover:underline"
              >
                查看全部单词
              </button>
            )}
            {filterMode === 'all' && (
              <button 
                onClick={resetProgress}
                className="mt-4 flex items-center gap-2 text-indigo-600 hover:underline"
              >
                <RotateCcw className="w-4 h-4" /> 重置进度
              </button>
            )}
          </div>
        ) : studyMode === 'list' ? (
          // List View
          <div className="space-y-2">
            {activeWords.map((word) => (
              <div key={word.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-800">{word.term}</div>
                  <div className="text-gray-600 text-sm">{word.definition}</div>
                </div>
                <button
                  onClick={() => updateWordStatus(word.id, word.status === 'familiar' ? 'unknown' : 'familiar')}
                  className={`p-2 rounded-full ${word.status === 'familiar' ? 'text-green-500 bg-green-50' : 'text-gray-300 bg-gray-50'}`}
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          // Flashcard & Dictation Container
          <div className="flex flex-col h-full justify-between">
            {/* Progress Indicator */}
            <div className="text-center text-sm text-gray-400 mb-2">
              单词 {currentIndex + 1} / {activeWords.length}
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
              
              {/* FLASHCARD MODE */}
              {studyMode === 'flashcard' && (
                <>
                  <div className="w-full flex justify-end mb-2">
                    <button 
                      onClick={() => setFlashcardDirection(prev => prev === 'en-zh' ? 'zh-en' : 'en-zh')}
                      className="text-xs text-indigo-500 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100"
                    >
                      <Settings className="w-3 h-3" />
                      {flashcardDirection === 'en-zh' ? '先英后中' : '先中后英'}
                    </button>
                  </div>
                  
                  <div 
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="w-full relative cursor-pointer perspective-1000 group h-80"
                  >
                    <div className={`w-full h-full relative preserve-3d transition-transform duration-500 ease-in-out bg-white rounded-2xl shadow-lg border-2 border-indigo-50 flex flex-col items-center justify-center p-8 text-center ${isFlipped ? 'rotate-y-180' : ''}`}
                         style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateX(180deg)' : 'rotateX(0deg)' }}
                    >
                      {/* Front Side */}
                      <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-6" style={{ backfaceVisibility: 'hidden' }}>
                        <span className="text-sm uppercase tracking-wider text-gray-400 mb-4">
                          {flashcardDirection === 'en-zh' ? 'Term' : 'Definition'}
                        </span>
                        <h2 className="text-3xl font-bold text-gray-800 break-words w-full">
                          {flashcardDirection === 'en-zh' ? currentWord.term : currentWord.definition}
                        </h2>
                        <div className="mt-8 text-gray-400 text-sm flex items-center gap-1">
                          <Eye className="w-4 h-4" /> 点击翻面
                        </div>
                      </div>

                      {/* Back Side */}
                      <div className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-6 rotate-x-180" style={{ backfaceVisibility: 'hidden', transform: 'rotateX(180deg)' }}>
                         <span className="text-sm uppercase tracking-wider text-gray-400 mb-4">
                          {flashcardDirection === 'en-zh' ? 'Definition' : 'Term'}
                        </span>
                        <h2 className="text-3xl font-bold text-indigo-600 break-words w-full">
                          {flashcardDirection === 'en-zh' ? currentWord.definition : currentWord.term}
                        </h2>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* DICTATION MODE */}
              {studyMode === 'dictation' && (
                <div className="w-full bg-white rounded-2xl shadow-lg border-2 border-indigo-50 p-8 flex flex-col items-center justify-center min-h-[320px]">
                  <span className="text-sm uppercase tracking-wider text-gray-400 mb-2">Definition</span>
                  <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">{currentWord.definition}</h2>
                  
                  <div className="w-full max-w-sm">
                    <input
                      type="text"
                      value={dictationInput}
                      onChange={(e) => {
                        setDictationInput(e.target.value);
                        setDictationResult(null);
                      }}
                      onKeyDown={handleKeyPress}
                      placeholder="Type the English term..."
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      className={`w-full p-4 text-lg text-center border-2 rounded-xl outline-none transition-all ${
                        dictationResult === 'correct' 
                          ? 'border-green-400 bg-green-50 text-green-700' 
                          : dictationResult === 'incorrect'
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 focus:border-indigo-400'
                      }`}
                    />
                    
                    {dictationResult === 'incorrect' && (
                      <div className="mt-4 text-center animate-in fade-in slide-in-from-top-2">
                        <p className="text-red-500 font-medium mb-1">Incorrect</p>
                        {showAnswerInDictation ? (
                          <p className="text-indigo-600 font-bold text-xl">{currentWord.term}</p>
                        ) : (
                          <button 
                            onClick={() => setShowAnswerInDictation(true)}
                            className="text-sm text-gray-500 hover:text-indigo-600 underline"
                          >
                            显示正确答案
                          </button>
                        )}
                      </div>
                    )}
                    
                    {dictationResult === 'correct' && (
                      <div className="mt-4 text-center text-green-600 font-bold text-lg animate-in zoom-in">
                        🎉 Correct!
                      </div>
                    )}
                    
                    <button
                      onClick={dictationResult === 'correct' ? nextCard : checkDictation}
                      className={`mt-6 w-full py-3 rounded-xl font-bold text-white transition-colors ${
                         dictationResult === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {dictationResult === 'correct' ? 'Next Word' : 'Check Answer'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons (Rating) - Available in both modes */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                onClick={() => updateWordStatus(currentWord.id, 'unknown')}
                className={`py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  currentWord.status === 'unknown' 
                    ? 'border-red-200 bg-red-50 text-red-600 ring-2 ring-red-100' 
                    : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500'
                }`}
              >
                <X className="w-6 h-6" />
                <span className="text-xs font-bold">陌生 / 忘记了</span>
              </button>
              
              <button
                onClick={() => updateWordStatus(currentWord.id, 'familiar')}
                className={`py-4 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                  currentWord.status === 'familiar' 
                    ? 'border-green-200 bg-green-50 text-green-600 ring-2 ring-green-100' 
                    : 'border-gray-200 text-gray-400 hover:border-green-200 hover:text-green-500'
                }`}
              >
                <Check className="w-6 h-6" />
                <span className="text-xs font-bold">熟悉 / 记住了</span>
              </button>
            </div>
            
            <div className="flex justify-between mt-4 px-2">
               <button onClick={prevCard} className="text-gray-400 hover:text-gray-600 text-sm">Prev</button>
               <button onClick={nextCard} className="text-gray-400 hover:text-gray-600 text-sm">Skip &rarr;</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default WordMaster;