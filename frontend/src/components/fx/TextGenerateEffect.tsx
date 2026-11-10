import React from "react";
import { motion } from "motion/react";

export const TextGenerateEffect: React.FC<{ words: string; className?: string }> = ({
  words,
  className = "",
}) => {
  const wordArray = words.split(" ");

  return (
    <span className={className}>
      {wordArray.map((word, idx) => (
        <motion.span
          key={word + idx}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: idx * 0.08 }}
          className="inline-block mr-2"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};
