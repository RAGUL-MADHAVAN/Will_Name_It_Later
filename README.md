# Smart Hostel Compliance & Resource Sharing Platform

A production-ready web application for hostel students and wardens to manage complaints and share resources with premium animations and modern UI/UX.

## Features

- **Authentication**: Secure JWT-based login system for students and wardens
- **Complaint Management**: Submit, track, and resolve hostel complaints
- **Resource Sharing**: Borrow and lend items among students
- **Admin Dashboard**: Live statistics and management interface
- **Premium Animations**: Smooth, purposeful animations using Framer Motion, Lottie, and Three.js

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- JWT Authentication
- bcrypt for password hashing

### Frontend
- React (Vite)
- Tailwind CSS
- Framer Motion (UI animations)
- Lottie (micro-interactions)
- Three.js (small visual elements)

## Project Structure

```
├── backend/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── animations/
│   │   └── utils/
│   └── public/
└── README.md
```

## Getting Started

### Backend Setup
1. Navigate to `backend/`
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start server: `npm start`

### Frontend Setup
1. Navigate to `frontend/`
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`

## Animation Guidelines

- Use Framer Motion for button clicks, hover effects, page transitions
- Use Lottie animations for submit, loading, success states
- Use Three.js sparingly in small canvases (hero sections, button effects)
- Animations must be smooth and purposeful
- Animations must NOT block core functionality
