
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Trophy, Pause, Play, Settings, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { WORDS } from '@/lib/words';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const INITIAL_LIVES = 5;
const WORDS_PER_LEVEL = 10;

const DIFFICULTY_SETTINGS = {
  easy: { baseSpeed: 1.5, increment: 0.1, spawnRate: 2500, spawnDecrement: 50 },
  medium: { baseSpeed: 2.5, increment: 0.15, spawnRate: 2000, spawnDecrement: 75 },
  hard: { baseSpeed: 4, increment: 0.2, spawnRate: 1500, spawnDecrement: 100 },
};

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
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [activeWords, setActiveWords] = useState<Word[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [level, setLevel] = useState(1);
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastWordId = useRef(0);
  const animationFrameId = useRef<number>();
  const spawnTimeoutId = useRef<NodeJS.Timeout>();


  const { baseSpeed, increment, spawnRate: baseSpawnRate, spawnDecrement } = DIFFICULTY_SETTINGS[difficulty];
  const spawnRate = Math.max(MIN_SPAWN_RATE, baseSpawnRate - (level - 1) * spawnDecrement);
  const wordSpeed = baseSpeed + (level - 1) * increment;

  const resetGame = useCallback((newDifficulty = difficulty) => {
    setScore(0);
    setLives(INITIAL_LIVES);
    setActiveWords([]);
    setInputValue('');
    setLevel(1);
    setGameState('playing');
    setIsPaused(false);
    setDifficulty(newDifficulty);
    lastWordId.current = 0;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [difficulty]);


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

  const gameLoop = useCallback(() => {
    if (isPaused || gameState !== 'playing') {
      animationFrameId.current = requestAnimationFrame(gameLoop);
      return;
    }

    const gameHeight = gameAreaRef.current?.offsetHeight ?? 0;
    
    setActiveWords(prevWords => {
      const newWords: Word[] = [];
      let livesToLose = 0;

      for (const word of prevWords) {
        const newY = word.y + word.speed;
        if (newY >= gameHeight) {
          livesToLose++;
        } else {
          newWords.push({ ...word, y: newY });
        }
      }

      if (livesToLose > 0) {
        setLives(prevLives => Math.max(0, prevLives - livesToLose));
      }
      
      return newWords;
    });

    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [isPaused, gameState, wordSpeed]);


  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      animationFrameId.current = requestAnimationFrame(gameLoop);
      spawnTimeoutId.current = setInterval(spawnWord, spawnRate);
      inputRef.current?.focus();
    } else {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (spawnTimeoutId.current) clearInterval(spawnTimeoutId.current);
    }
    
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (spawnTimeoutId.current) clearInterval(spawnTimeoutId.current);
    };
  }, [gameState, isPaused, spawnRate, gameLoop, spawnWord]);


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
    if (isPaused) return;
    setInputValue(e.target.value.toLowerCase().trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isPaused) return;
    if (e.key === 'Enter' && inputValue) {
      const matchedIndex = activeWords.findIndex((word) => word.text === inputValue);

      if (matchedIndex !== -1) {
        // Prevent life loss if word is already off-screen but not yet removed from state
        if (gameAreaRef.current && activeWords[matchedIndex].y < gameAreaRef.current.offsetHeight) {
            setScore((prev) => prev + 10);
            setActiveWords((prev) => prev.filter((_, i) => i !== matchedIndex));
            setInputValue('');
        }
      } else {
        setLives((prevLives) => Math.max(0, prevLives - 1));
        setInputValue('');
      }
    }
  };

  const togglePause = () => {
    if(gameState !== 'playing') return;
    setIsPaused(prev => !prev);
  }

  const handleDifficultyChange = (value: 'easy' | 'medium' | 'hard') => {
    if (value) {
      setDifficulty(value);
      if (gameState === 'playing') {
        resetGame(value);
      }
    }
  }

  const renderGameMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="w-5 h-5" />
          <span className="sr-only">Game Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Game</DropdownMenuLabel>
        <DropdownMenuItem onSelect={togglePause} disabled={gameState !== 'playing'}>
          {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => resetGame(difficulty)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Restart</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Difficulty</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={difficulty} onValueChange={(value) => handleDifficultyChange(value as 'easy' | 'medium' | 'hard')}>
          <DropdownMenuRadioItem value="easy">Easy</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="medium">Medium</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="hard">Hard</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const renderGameStats = () => (
    <div className="absolute top-4 left-4 right-4 flex justify-between items-center text-accent z-10 p-4 bg-background/50 rounded-lg backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-2xl font-bold" style={{textShadow: '0 0 8px hsl(var(--primary))'}}>
            <Trophy className="w-7 h-7" />
            <span>Score: {score}</span>
        </div>
        <div className="text-xl font-bold text-muted-foreground">Level: {level}</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            {Array.from({ length: lives }).map((_, i) => (
            <Heart key={i} className="w-8 h-8 text-primary fill-primary" style={{filter: 'drop-shadow(0 0 5px hsl(var(--primary)))'}} />
            ))}
            {Array.from({ length: INITIAL_LIVES - lives }).map((_, i) => (
            <Heart key={i} className="w-8 h-8 text-gray-600" />
            ))}
        </div>
        {renderGameMenu()}
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
            <p className="text-muted-foreground mb-6">Type the falling words before they hit the bottom. Select your difficulty and start the challenge!</p>
            <ToggleGroup 
              type="single" 
              value={difficulty} 
              onValueChange={(value: 'easy' | 'medium' | 'hard') => value && setDifficulty(value)}
              className="mb-8 justify-center"
            >
              <ToggleGroupItem value="easy">Easy</ToggleGroupItem>
              <ToggleGroupItem value="medium">Medium</ToggleGroupItem>
              <ToggleGroupItem value="hard">Hard</ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => resetGame(difficulty)} size="lg" className="text-xl">Start Game</Button>
          </CardFooter>
        </Card>
      )}

      {gameState === 'playing' && (
        <div className="relative w-full h-screen" ref={gameAreaRef}>
          {isPaused && (
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                <Card className="w-full max-w-sm text-center">
                    <CardHeader>
                        <CardTitle className="text-4xl">Paused</CardTitle>
                    </CardHeader>
                    <CardFooter className="flex justify-center">
                        <Button onClick={togglePause} size="lg">Resume</Button>
                    </CardFooter>
                </Card>
             </div>
          )}
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
                disabled={isPaused}
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
             <p className="text-lg text-muted-foreground">Difficulty: <span className="capitalize">{difficulty}</span></p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => resetGame(difficulty)} size="lg" className="text-xl">Play Again</Button>
          </CardFooter>
        </Card>
      )}
    </main>
  );
}

    