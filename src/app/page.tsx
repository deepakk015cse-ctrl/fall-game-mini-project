
"use client";

import { useState, useEffect, useRef, useCallback, createRef } from 'react';
import { Trophy, Clock, Pause, Play, Settings, RefreshCw, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const WORDS_PER_LEVEL = 10;
const POINTS_PER_WORD = 2;
const INITIAL_GAME_DURATION = 60;

const DIFFICULTY_SETTINGS = {
  easy: { baseSpeed: 0.5, increment: 0.05, spawnRate: 3000, spawnDecrement: 50 },
  medium: { baseSpeed: 0.8, increment: 0.075, spawnRate: 2500, spawnDecrement: 75 },
  hard: { baseSpeed: 1.2, increment: 0.1, spawnRate: 2000, spawnDecrement: 100 },
};

const MIN_SPAWN_RATE = 500;

type Word = {
  id: number;
  text: string;
  x: number;
  y: number;
  speed: number;
  ref: React.RefObject<HTMLSpanElement>;
};

export default function TypeFallGame() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameOver'>('menu');
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(INITIAL_GAME_DURATION);
  const [gameDuration, setGameDuration] = useState(INITIAL_GAME_DURATION);
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
  const timerIntervalId = useRef<NodeJS.Timeout>();

  const wordsRef = useRef<Word[]>([]);
  wordsRef.current = activeWords;

  const { baseSpeed, increment, spawnRate: baseSpawnRate, spawnDecrement } = DIFFICULTY_SETTINGS[difficulty];
  const spawnRate = Math.max(MIN_SPAWN_RATE, baseSpawnRate - (level - 1) * spawnDecrement);
  const wordSpeed = baseSpeed + (level - 1) * increment;

  useEffect(() => {
    const savedHighScore = localStorage.getItem('typefallHighScore');
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  const resetGame = useCallback((newDifficulty = difficulty, newDuration = gameDuration) => {
    setScore(0);
    setTimeRemaining(newDuration);
    setGameDuration(newDuration);
    setActiveWords([]);
    setInputValue('');
    setLevel(1);
    setGameState('playing');
    setIsPaused(false);
    setDifficulty(newDifficulty);
    lastWordId.current = 0;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [difficulty, gameDuration]);

  const spawnWord = useCallback(() => {
    if (!gameAreaRef.current) return;
    const gameWidth = gameAreaRef.current.offsetWidth;
    const text = WORDS[Math.floor(Math.random() * WORDS.length)];
    const wordWidth = text.length * 12; // A simple approximation for word width
    
    const newWord: Word = {
      id: lastWordId.current++,
      text,
      x: Math.random() * (gameWidth - wordWidth),
      y: -20,
      speed: wordSpeed,
      ref: createRef(),
    };
    setActiveWords((prev) => [...prev, newWord]);
  }, [wordSpeed]);

  const gameLoop = useCallback(() => {
    if (gameAreaRef.current && !isPaused) {
      const gameHeight = gameAreaRef.current.offsetHeight;
      const wordsToRemove: number[] = [];
      
      wordsRef.current.forEach(word => {
        word.y += word.speed;
        if (word.ref.current) {
          word.ref.current.style.transform = `translateY(${word.y}px)`;
        }
        if (word.y >= gameHeight) {
          wordsToRemove.push(word.id);
        }
      });
  
      if (wordsToRemove.length > 0) {
        setActiveWords(prev => prev.filter(word => !wordsToRemove.includes(word.id)));
      }
    }
    animationFrameId.current = requestAnimationFrame(gameLoop);
  }, [isPaused]);


  useEffect(() => {
    if (gameState === 'playing' && !isPaused) {
      animationFrameId.current = requestAnimationFrame(gameLoop);
      
      spawnTimeoutId.current = setInterval(() => {
        spawnWord();
      }, spawnRate);

      timerIntervalId.current = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);

      inputRef.current?.focus();
    } else {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (spawnTimeoutId.current) clearInterval(spawnTimeoutId.current);
      if (timerIntervalId.current) clearInterval(timerIntervalId.current);
    }
    
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      if (spawnTimeoutId.current) clearInterval(spawnTimeoutId.current);
      if (timerIntervalId.current) clearInterval(timerIntervalId.current);
    };
  }, [gameState, isPaused, spawnRate, gameLoop, spawnWord]);


  useEffect(() => {
    if (timeRemaining <= 0 && gameState === 'playing') {
      setGameState('gameOver');
      if (score > highScore) {
        setHighScore(score);
        localStorage.setItem('typefallHighScore', String(score));
      }
    }
  }, [timeRemaining, gameState, score, highScore]);
  
  useEffect(() => {
    if (score > 0 && score % (WORDS_PER_LEVEL * POINTS_PER_WORD) === 0) {
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
        if (gameAreaRef.current && activeWords[matchedIndex].y < gameAreaRef.current.offsetHeight) {
            setScore((prev) => prev + POINTS_PER_WORD);
            setActiveWords((prev) => prev.filter((_, i) => i !== matchedIndex));
            setInputValue('');
        } else {
            setInputValue('');
        }
      } else {
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
        resetGame(value, gameDuration);
      }
    }
  }

  const handleDurationChange = (value: string) => {
    const newDuration = parseInt(value, 10);
    if (!isNaN(newDuration)) {
      setGameDuration(newDuration);
      if (gameState === 'playing') {
        resetGame(difficulty, newDuration);
      }
    }
  }

  const renderGameMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="w-5 h-5 text-yellow-400" />
          <span className="sr-only">Game Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Game</DropdownMenuLabel>
        <DropdownMenuItem onSelect={togglePause} disabled={gameState !== 'playing'}>
          {isPaused ? <Play className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
          <span>{isPaused ? 'Resume' : 'Pause'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => resetGame(difficulty, gameDuration)}>
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
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Game Duration</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(gameDuration)} onValueChange={handleDurationChange}>
          <DropdownMenuRadioItem value="30">30s</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="60">60s</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="90">90s</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="120">120s</DropdownMenuRadioItem>
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
        <div className="flex items-center gap-2 text-2xl font-bold text-cyan-400" style={{textShadow: '0 0 8px hsl(var(--ring))'}}>
            <Clock className="w-7 h-7" />
            <span>{timeRemaining}s</span>
        </div>
        {renderGameMenu()}
      </div>
    </div>
  );

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground font-headline overflow-hidden">
      {gameState === 'menu' && (
        <Card className="w-full max-w-2xl text-center bg-card/80 backdrop-blur-sm animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-5xl font-bold text-primary" style={{textShadow: '0 0 10px hsl(var(--primary))'}}>TypeFall Challenge</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">Type the falling words to score points before time runs out!</p>
            <div className="flex items-center justify-center gap-2 text-2xl mb-8 text-amber-400">
              <Star className="w-7 h-7"/>
              <span className="font-bold">High Score: {highScore}</span>
            </div>
            <div className="flex flex-col gap-8 mb-8 p-4">
              <div>
                <Label className="font-bold text-lg mb-2 block text-left">Difficulty</Label>
                <ToggleGroup 
                  type="single" 
                  defaultValue="medium"
                  value={difficulty} 
                  onValueChange={(value: 'easy' | 'medium' | 'hard') => value && setDifficulty(value)}
                  className="grid grid-cols-3"
                >
                  <ToggleGroupItem value="easy">Easy</ToggleGroupItem>
                  <ToggleGroupItem value="medium">Medium</ToggleGroupItem>
                  <ToggleGroupItem value="hard">Hard</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <Label className="font-bold text-lg mb-2 block text-left">Game Duration (seconds)</Label>
                 <ToggleGroup 
                  type="single" 
                  defaultValue="60"
                  value={String(gameDuration)} 
                  onValueChange={(value) => value && handleDurationChange(value)}
                  className="grid grid-cols-4"
                >
                  <ToggleGroupItem value="30">30s</ToggleGroupItem>
                  <ToggleGroupItem value="60">60s</ToggleGroupItem>
                  <ToggleGroupItem value="90">90s</ToggleGroupItem>
                  <ToggleGroupItem value="120">120s</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => resetGame(difficulty, gameDuration)} size="lg" className="text-xl">Start Game</Button>
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
              ref={word.ref}
              className={cn(
                "absolute font-bold text-lg transition-colors duration-200",
                word.text === highlightedWord ? "text-primary scale-110" : "text-foreground"
              )}
              style={{
                left: `${word.x}px`,
                top: `0px`,
                transform: `translateY(${word.y}px)`,
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
            <CardTitle className="text-5xl font-bold text-destructive" style={{textShadow: '0 0 10px hsl(var(--destructive))'}}>Time's Up!</CardTitle>
          </CardHeader>
          <CardContent>
            {score > highScore && (
                <p className="text-2xl mb-4 text-amber-400 font-bold" style={{textShadow: '0 0 8px hsl(var(--primary))'}}>New High Score!</p>
            )}
            <p className="text-2xl mb-2">Final Score</p>
            <p className="text-6xl font-bold text-primary mb-6" style={{textShadow: '0 0 10px hsl(var(--primary))'}}>{score}</p>
             <div className="flex items-center justify-center gap-2 text-xl mb-6 text-amber-400">
                <Star className="w-6 h-6"/>
                <span className="font-bold">High Score: {highScore}</span>
             </div>
             <p className="text-lg text-muted-foreground">Difficulty: <span className="capitalize">{difficulty}</span></p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => setGameState('menu')} size="lg" className="text-xl">Main Menu</Button>
          </CardFooter>
        </Card>
      )}
    </main>
  );

    