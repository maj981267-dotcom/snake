"use client";

import React, { useEffect, useRef, useState } from "react";

type Point = { x: number; y: number };

const SCALE = 20; // cell size in px
const COLS = 20;
const ROWS = 20;
const WIDTH = COLS * SCALE;
const HEIGHT = ROWS * SCALE;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snake, setSnake] = useState<Point[]>([ { x: 9, y: 9 }]);
  const [dir, setDir] = useState<Point>({ x: 1, y: 0 });
  const [food, setFood] = useState<Point>(() => randomFood([ { x: 9, y: 9 }]));
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [speed, setSpeed] = useState(120);
  const [playerName, setPlayerName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!nameSet) return;
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key;
      if (key === "ArrowUp" || key === "w") changeDir({ x: 0, y: -1 });
      if (key === "ArrowDown" || key === "s") changeDir({ x: 0, y: 1 });
      if (key === "ArrowLeft" || key === "a") changeDir({ x: -1, y: 0 });
      if (key === "ArrowRight" || key === "d") changeDir({ x: 1, y: 0 });
      if (key === " ") setRunning(r => !r);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [snake, nameSet]);

  useEffect(() => {
    const id = setInterval(() => {
      if (running) step();
    }, speed);
    return () => clearInterval(id);
  }, [snake, dir, running, speed]);

  useEffect(() => {
    draw();
  }, [snake, food]);

  function changeDir(d: Point) {
    // prevent reversing
    if (snake.length > 1) {
      const head = snake[0];
      const neck = snake[1];
      if (head.x + d.x === neck.x && head.y + d.y === neck.y) return;
    }
    setDir(d);
  }

  function step() {
    setSnake(prev => {
      const head = prev[0];
      const newHead = { x: mod(head.x + dir.x, COLS), y: mod(head.y + dir.y, ROWS) };
      // collision with self -> game over
      if (prev.some(p => p.x === newHead.x && p.y === newHead.y)) {
        setRunning(false);
        setGameOver(true);
        // 保存分数到数据库
        saveScore(score);
        return prev;
      }
      let grew = false;
      if (newHead.x === food.x && newHead.y === food.y) {
        grew = true;
        setScore(s => s + 1);
        setFood(randomFood([newHead, ...prev]));
        // slight speed up
        setSpeed(s => Math.max(40, s - 3));
      }
      const next = [newHead, ...prev];
      if (!grew) next.pop();
      return next;
    });
  }

  function draw() {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    // background
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    // food
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(food.x * SCALE, food.y * SCALE, SCALE, SCALE);
    // snake
    ctx.fillStyle = "#10b981";
    for (let i = 0; i < snake.length; i++) {
      const p = snake[i];
      ctx.fillRect(p.x * SCALE + 1, p.y * SCALE + 1, SCALE - 2, SCALE - 2);
    }
  }

  function reset() {
    setSnake([ { x: 9, y: 9 }]);
    setDir({ x: 1, y: 0 });
    setFood(randomFood([ { x: 9, y: 9 }]));
    setScore(0);
    setSpeed(120);
    setRunning(true);
    setGameOver(false);
  }

  async function saveScore(finalScore: number) {
    try {
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, score: finalScore }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log('分数已保存:', data);
      } else {
        console.error('保存失败:', data);
      }
    } catch (error) {
      console.error('保存分数错误:', error);
    }
  }

  return (
    <div className="game-root">
      <div className="game-panel">
        <h1>贪吃蛇</h1>
        {!nameSet ? (
          <form
            className="player-form"
            onSubmit={e => {
              e.preventDefault();
              if (playerName.trim()) setNameSet(true);
            }}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <label htmlFor="playerName">请输入玩家名称：</label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={20}
              required
              style={{ padding: "6px", borderRadius: "6px", border: "1px solid #ccc" }}
            />
            <button type="submit" style={{ marginTop: 8, padding: "8px 12px", borderRadius: 6, background: "#06b6d4", color: "#052f3b", border: "none" }}>
              开始游戏
            </button>
          </form>
        ) : (
          <>
            <div className="hud">
              <div>玩家: <strong>{playerName}</strong></div>
              <div>得分: <strong>{score}</strong></div>
              <div>速度: <strong>{Math.round(1000 / speed)}</strong></div>
            </div>
            <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="game-canvas" />
            {gameOver && <div className="game-over">游戏结束！分数已保存</div>}
            <div className="controls">
              <button onClick={() => setRunning(r => !r)}>{running ? "暂停" : "继续"}</button>
              <button onClick={reset}>重新开始</button>
            </div>
            <p className="hint">使用方向键或 WASD 控制，空格 暂停/继续。</p>
          </>
        )}
      </div>
    </div>
  );
}

function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

function randomFood(occupied: Point[]) {
  while (true) {
    const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!occupied.some(o => o.x === p.x && o.y === p.y)) return p;
  }
}

