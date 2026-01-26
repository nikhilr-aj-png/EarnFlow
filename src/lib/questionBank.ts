
export interface QuestionTemplate {
  text: string;
  options: string[];
  correctAnswer: string; // Storing value to allow shuffling
}

export const QUESTION_BANK: QuestionTemplate[] = [
  // General Knowledge
  { text: "Which is the largest ocean in the world?", options: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"], correctAnswer: "Pacific Ocean" },
  { text: "Who wrote 'Romeo and Juliet'?", options: ["William Shakespeare", "Charles Dickens", "Mark Twain", "Jane Austen"], correctAnswer: "William Shakespeare" },
  { text: "What is the capital of Japan?", options: ["Tokyo", "Kyoto", "Osaka", "Seoul"], correctAnswer: "Tokyo" },
  { text: "Which country is known as the Land of the Rising Sun?", options: ["Japan", "China", "India", "Thailand"], correctAnswer: "Japan" },
  { text: "What is the hardest natural substance on Earth?", options: ["Diamond", "Gold", "Iron", "Platinum"], correctAnswer: "Diamond" },

  // Science
  { text: "What is the chemical symbol for Gold?", options: ["Au", "Ag", "Fe", "Pb"], correctAnswer: "Au" },
  { text: "Which planet is known as the Red Planet?", options: ["Mars", "Venus", "Jupiter", "Saturn"], correctAnswer: "Mars" },
  { text: "What gas do plants absorb from the atmosphere?", options: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Hydrogen"], correctAnswer: "Carbon Dioxide" },
  { text: "What is the powerhouse of the cell?", options: ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"], correctAnswer: "Mitochondria" },
  { text: "How many bones are in the adult human body?", options: ["206", "210", "198", "208"], correctAnswer: "206" },

  // History & Geography
  { text: "Who was the first President of the United States?", options: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "John Adams"], correctAnswer: "George Washington" },
  { text: "In which year did the Titanic sink?", options: ["1912", "1905", "1920", "1898"], correctAnswer: "1912" },
  { text: "Which is the longest river in the world?", options: ["Nile", "Amazon", "Yangtze", "Mississippi"], correctAnswer: "Nile" },
  { text: "Which continent is the Sahara Desert located in?", options: ["Africa", "Asia", "South America", "Australia"], correctAnswer: "Africa" },

  // Tech
  { text: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Process Utility", "Central Processor Unit"], correctAnswer: "Central Processing Unit" },
  { text: "Who is the founder of Microsoft?", options: ["Bill Gates", "Steve Jobs", "Mark Zuckerberg", "Jeff Bezos"], correctAnswer: "Bill Gates" },
  { text: "What does 'www' stand for?", options: ["World Wide Web", "World Web Wide", "Web World Wide", "Wide World Web"], correctAnswer: "World Wide Web" },
];

export function getRandomQuestions(count: number, topic?: string): any[] {
  // Shuffle the bank
  const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());

  // Select top 'count' questions
  const selected = shuffled.slice(0, count);

  // Format for the app (Shuffle options and find correct index)
  return selected.map(q => {
    // Shuffle options
    const shuffledOptions = [...q.options].sort(() => 0.5 - Math.random());
    const correctIndex = shuffledOptions.indexOf(q.correctAnswer);

    return {
      text: q.text,
      options: shuffledOptions,
      correctAnswer: correctIndex
    };
  });
}
