# 🃏 Bluff - Online Multiplayer Card Game

A real-time multiplayer implementation of the classic card game **Bluff** (also known as "BS", "Cheat", or "I Doubt It"), built with Next.js and Socket.IO.

## 🌟 Features

- **Real-time Multiplayer**: Play synchronously with friends using WebSockets.
- **Dynamic Decks**: The game automatically calculates the required number of decks based on the number of players (e.g., 2 decks for 5 players) ensuring a balanced game.
- **Google Authentication**: Secure sign-in using NextAuth.js.
- **Custom Game Engine**: Robust server-side logic verifying turns, plays, and bluffs.
- **Beautiful UI**: Dark premium gaming theme, glassmorphism, smooth animations, and interactive CSS playing cards.
- **Turn Timer**: Fast-paced action with active turn tracking.

## 🛠️ Tech Stack

- **Frontend**: [Next.js 14](https://nextjs.org/) (App Router), React
- **Backend**: Custom Node.js Server integrating Next.js + [Socket.IO](https://socket.io/)
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Google Provider)
- **Styling**: Vanilla CSS Modules (Zero overhead, custom design system)

## 📋 How to Play

1. **Setup**: The game uses `N` decks based on player count. Everyone is dealt exactly 10 cards. The remaining cards form a reserve deck.
2. **The Goal**: Be the first player to empty your hand!
3. **Playing**: On your turn, place 1 to 4 cards face-down and declare them as the required rank.
4. **Bluffing**: You don't have to play the rank you declare! You can play any cards—that's bluffing.
5. **Calling Bluff**: Any other player can call "Bluff!" on the last play. 
   - If the player lied, they pick up the entire center pile.
   - If the player told the truth, the caller picks up the pile.
6. **Passing**: If you can't (or won't) play, you can "Pass and Draw" a card from the reserve deck. Wait for your next turn.

## 🚀 Running Locally

### Prerequisites
- Node.js (v18 or newer)
- A Google Cloud Console account (for OAuth credentials)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/bluff-game.git
   cd bluff-game
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   > Note: We use a custom server (`server/index.js`) to run Next.js and Socket.IO on the same port.

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## ☁️ Deployment (Render.com)

Because this game relies on persistent WebSockets (`Socket.IO`), standard Serverless platforms (like Vercel) will drop connections. **Render.com** (Web Service) or **Railway.app** are highly recommended.

A `render.yaml` Blueprint is included in this repository.

1. Push this repository to GitHub.
2. Sign in to [Render](https://render.com/).
3. Go to **Blueprints** > **New Blueprint Instance**.
4. Connect your GitHub repository.
5. Render will automatically detect the `render.yaml` file and configure the service.
6. Go to your new Web Service's **Environment** tab on Render and add the missing variables:
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (Your exact Render URL, e.g., `https://bluff-game-xyz.onrender.com`)
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

7. Click **Deploy Latest Commit**.

## 📝 License
MIT License
