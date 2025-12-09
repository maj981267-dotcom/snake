import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function POST(req: Request) {
  try {
    const { playerName, score } = await req.json();

    if (!playerName || score === undefined) {
      return Response.json(
        { error: '玩家名称和分数不能为空' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO public.player_score (player_name, score) VALUES ($1, $2)',
        [playerName, score]
      );
      return Response.json({ success: true, message: '分数已保存' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('数据库错误:', error);
    return Response.json(
      { error: '保存分数失败，请重试' },
      { status: 500 }
    );
  }
}
