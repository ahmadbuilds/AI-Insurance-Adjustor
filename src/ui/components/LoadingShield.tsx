"use client";

import { motion } from "framer-motion";

export function LoadingShield({ className = "w-16 h-16", color = "#4F46E5" }: { className?: string, color?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-full h-full drop-shadow-2xl scale-125 md:scale-150"
      >
        {/* Outer Hexagon Shell (Static/Muted Base) */}
        <path 
          d="M12 2L2 7v10l10 5 10-5V7L12 2z" 
          stroke={color} 
          className="opacity-20"
        />
        {/* Outer Hexagon (Animated Tracing Path) */}
        <motion.path 
          d="M12 2L2 7v10l10 5 10-5V7L12 2z" 
          stroke={color}
          initial={{ pathLength: 0, pathOffset: 0 }}
          animate={{ pathLength: [0, 0.3, 0], pathOffset: [0, 1, 2] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Inner Diamond/AI Core Box (Static/Muted Base) */}
        <path 
          d="M12 5.5l-5 4.5v4l5 4.5 5-4.5v-4z" 
          stroke="#8B5CF6" 
          className="opacity-20"
        />
        {/* Inner Diamond/AI Core Box (Animated Tracing Path) */}
        <motion.path 
          d="M12 5.5l-5 4.5v4l5 4.5 5-4.5v-4z" 
          stroke="#38BDF8"
          initial={{ pathLength: 0, pathOffset: 1 }}
          animate={{ pathLength: [0, 0.4, 0], pathOffset: [1, 0, -1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        />

        {/* Neural Network Nodes (Connecting lines to center) */}
        <motion.path 
          d="M12 10v4 M10 12h4" 
          stroke="#8B5CF6"
          strokeWidth="1"
          style={{ originX: "12px", originY: "12px" }}
          animate={{ rotate: [0, 90], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Pulsing AI Energy Core */}
        <motion.circle
          cx="12" cy="12" r="1.5"
          fill="#38BDF8"
          initial={{ opacity: 0.2, scale: 0.5 }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.6, 1.4, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>
    </div>
  );
}
