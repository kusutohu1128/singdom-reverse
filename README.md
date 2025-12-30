# 🎤 Singdom Reverse（シンドムリバース）

**逆再生された音声から元の言葉を当てる、リアルタイムマルチプレイヤーゲーム**

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

---

## 🎮 ゲーム概要

プレイヤーはお題となる言葉を録音し、その音声が**逆再生**されて他のプレイヤーに届きます。逆再生された音声を聞いて、元の言葉を当てましょう！

### ゲームフロー

```
🎯 LOBBY（ロビー）
    ↓ ホストがゲーム開始
📝 TOPIC_CREATION（お題作成）
    ↓ 全員が録音完了
🔀 SHUFFLE（シャッフル）
    ↓ 3秒のアニメーション
🎧 RECORDING（回答フェーズ）
    ↓ 全員が回答完了
🏆 RESULT（結果発表）
```

---

## ✨ 主な機能

- **リアルタイムマルチプレイヤー** - Supabase Realtime による低遅延な同期
- **音声録音 & 逆再生** - ブラウザ内で録音し、バックエンドで音声処理
- **ルームシステム** - 6桁のルームコードで簡単参加
- **レスポンシブデザイン** - モバイルフレンドリーなUI

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **フレームワーク** | Next.js 16 (App Router) |
| **言語** | TypeScript |
| **スタイリング** | Tailwind CSS 4 |
| **アニメーション** | Framer Motion |
| **リアルタイム通信** | Supabase Realtime |
| **音声処理** | Web Audio API + 外部バックエンド |

---

## 🚀 セットアップ

### 前提条件

- Node.js 18+
- npm / yarn / pnpm
- [Audio Effects Backend](https://github.com/kusutohu1128/audio-effects-backend) が起動していること

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/kusutohu1128/singdom-reverse.git
cd singdom-reverse

# 依存関係をインストール
npm install
```

### 環境変数の設定

`.env.local` ファイルを作成：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセス

---

## 📁 プロジェクト構成

```
singdom-reverse/
├── app/
│   ├── page.tsx           # ホーム画面（ルーム作成/参加）
│   ├── layout.tsx         # 共通レイアウト
│   └── room/
│       └── [roomId]/
│           └── page.tsx   # ゲームルーム画面
├── components/
│   └── game/
│       ├── TopicCreation.tsx  # お題作成コンポーネント
│       └── Gameplay.tsx       # 回答フェーズコンポーネント
├── hooks/
│   ├── useGameRoom.ts      # ゲーム状態管理
│   ├── useAudioRecorder.ts # 音声録音
│   └── useAudioPlayer.ts   # 音声再生
├── lib/
│   ├── supabase.ts         # Supabaseクライアント
│   ├── audio.ts            # 音声処理API
│   └── messages.ts         # ゲーム内メッセージ
└── ...
```

---

## 🔗 関連リポジトリ

- **[Audio Effects Backend](https://github.com/kusutohu1128/audio-effects-backend)** - 音声処理バックエンド（FastAPI + C++ JUCE）

---

## 📝 デプロイ

### Vercel（推奨）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kusutohu1128/singdom-reverse)

1. Vercel にサインイン
2. このリポジトリをインポート
3. 環境変数を設定
4. デプロイ！

---

## 📜 ライセンス

MIT License

---

## 🙏 謝辞

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)
