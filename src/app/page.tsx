"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WORDS } from '@/lib/words';
import { cn } from '@/lib/utils';

const INITIAL_LIVES = 5;
const WORDS_PER_LEVEL = 10;
const BASE_SPEED = 0.5;
const SPEED_INCREMENT = 0.1;
const BASE_SPAWN_RATE = 2000;
const SPAWN_RATE_DECREMENT = 50;
const MIN_SPAWN_RATE = 500;

type Word = {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
};

export default function TypeFallGame() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [activeWords, setActiveWords] = useState<Word[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [level, setLevel] = useState(1);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastWordId = useRef(0);
  const lastSpawnTime = useRef(Date.now());

  const spawnRate = Math.max(MIN_SPAWN_RATE, BASE_SPAWN_RATE - (level - 1) * SPAWN_RATE_DECREMENT);
  const wordSpeed = BASE_SPEED + (level - 1) * SPEED_INCREMENT;

  const resetGame = useCallback(() => {
    setScore(0);
    setLives(INITIAL_LIVES);
    setActiveWords([]);
    setInputValue('');
    setLevel(1);
    setGameState('playing');
    lastWordId.current = 0;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const spawnWord = useCallback(() => {
    if (!gameAreaRef.current) return;
    const gameWidth = gameAreaRef.current.offsetWidth;
    const text = WORDS[Math.floor(Math.random() * WORDS.length)];
    // A simple approximation for word width
    const wordWidth = text.length * 12;
    
    const newWord: Word = {
      id: lastWordId.current++,
      text,
      x: Math.random() * (gameWidth - wordWidth),
      y: -20,
      speed: wordSpeed,
    };
    setActiveWords((prev) => [...prev, newWord]);
  }, [wordSpeed]);

  useEffect(() => {
    if (gameState === 'playing') {
      const gameLoop = (timestamp: number) => {
        if (!gameAreaRef.current) return;
        const gameHeight = gameAreaRef.current.offsetHeight;

        setActiveWords((prevWords) =>
          prevWords
            .map((word) => ({
              ...word,
              y: word.y + word.speed,
            }))
            .filter((word) => {
              if (word.y >= gameHeight) {
                setLives((prevLives) => Math.max(0, prevLives - 1));
                return false;
              }
              return true;
            })
        );
        
        if(Date.now() - lastSpawnTime.current > spawnRate) {
          spawnWord();
          lastSpawnTime.current = Date.now();
        }

        animationFrameId = requestAnimationFrame(gameLoop);
      };
      
      let animationFrameId = requestAnimationFrame(gameLoop);
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [gameState, spawnRate, spawnWord]);

  useEffect(() => {
    if (lives <= 0) {
      setGameState('gameOver');
    }
  }, [lives]);
  
  useEffect(() => {
    if (score > 0 && score % (WORDS_PER_LEVEL * 10) === 0) {
      setLevel(prev => prev + 1);
    }
  }, [score]);
  
  useEffect(() => {
    if (gameState === 'playing') {
      inputRef.current?.focus();
    }
  }, [gameState]);

  useEffect(() => {
    if (inputValue) {
        const match = activeWords.find(word => word.text.startsWith(inputValue));
        setHighlightedWord(match ? match.text : null);
    } else {
        setHighlightedWord(null);
    }
  }, [inputValue, activeWords]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value.toLowerCase().trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue) {
      const matchedIndex = activeWords.findIndex((word) => word.text === inputValue);

      if (matchedIndex !== -1) {
        setScore((prev) => prev + 10);
        setActiveWords((prev) => prev.filter((_, i) => i !== matchedIndex));
        setInputValue('');
      }
    }
  };

  const renderGameStats = () => (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-accent z-10 p-4 bg-background/50 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 text-2xl font-bold" style={{textShadow: '0 0 8px hsl(var(--primary))'}}>
        <Trophy className="w-7 h-7" />
        <span>Score: {score}</span>
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: lives }).map((_, i) => (
          <Heart key={i} className="w-8 h-8 text-primary fill-primary" style={{filter: 'drop-shadow(0 0 5px hsl(var(--primary)))'}} />
        ))}
         {Array.from({ length: INITIAL_LIVES - lives }).map((_, i) => (
          <Heart key={i} className="w-8 h-8 text-gray-600" />
        ))}
      </div>
    </div>
  );

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground font-headline overflow-hidden">
      {gameState === 'menu' && (
        <Card className="w-full max-w-md text-center bg-card/80 backdrop-blur-sm animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-5xl font-bold text-primary" style={{textShadow: '0 0 10px hsl(var(--primary))'}}>TypeFall Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Type the falling words before they hit the bottom. How long can you survive?</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={resetGame} size="lg" className="text-xl">Start Game</Button>
          </CardFooter>
        </Card>
      )}

      {gameState === 'playing' && (
        <div className="relative w-full h-screen" ref={gameAreaRef}>
          {renderGameStats()}
          {activeWords.map((word) => (
            <span
              key={word.id}
              className={cn(
                "absolute font-bold text-lg transition-colors duration-200",
                word.text === highlightedWord ? "text-primary scale-110" : "text-foreground"
              )}
              style={{
                left: `${word.x}px`,
                top: `${word.y}px`,
                textShadow: word.text === highlightedWord ? '0 0 10px hsl(var(--primary))' : 'none'
              }}
            >
              {word.text}
            </span>
          ))}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
             <Input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type here..."
                className="w-full text-center text-lg h-12 bg-input/80 backdrop-blur-sm focus:ring-2 focus:ring-ring"
                autoComplete="off"
            />
          </div>
        </div>
      )}

      {gameState === 'gameOver' && (
        <Card className="w-full max-w-md text-center bg-card/80 backdrop-blur-sm animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-5xl font-bold text-destructive" style={{textShadow: '0 0 10px hsl(var(--destructive))'}}>Game Over</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl mb-2">Final Score</p>
            <p className="text-6xl font-bold text-primary mb-6" style={{textShadow: '0 0 10px hsl(var(--primary))'}}>{score}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={resetGame} size="lg" className="text-xl">Play Again</Button>
          </CardFooter>
        </Card>
      )}
    </main>
  );
}
