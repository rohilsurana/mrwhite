export interface WordPair {
  normal: string;
  spy: string;
  category: string;
}

export const wordPairs: WordPair[] = [
  // Places
  { normal: 'Beach', spy: 'Pool', category: 'Places' },
  { normal: 'Hospital', spy: 'Clinic', category: 'Places' },
  { normal: 'Airport', spy: 'Train Station', category: 'Places' },
  { normal: 'Library', spy: 'Bookstore', category: 'Places' },
  { normal: 'Church', spy: 'Temple', category: 'Places' },
  { normal: 'Museum', spy: 'Gallery', category: 'Places' },
  { normal: 'Zoo', spy: 'Aquarium', category: 'Places' },
  { normal: 'Stadium', spy: 'Arena', category: 'Places' },
  { normal: 'Hotel', spy: 'Motel', category: 'Places' },
  { normal: 'Castle', spy: 'Palace', category: 'Places' },
  { normal: 'Gym', spy: 'Yoga Studio', category: 'Places' },
  { normal: 'Cinema', spy: 'Theater', category: 'Places' },

  // Food & Drink
  { normal: 'Pizza', spy: 'Burger', category: 'Food & Drink' },
  { normal: 'Coffee', spy: 'Tea', category: 'Food & Drink' },
  { normal: 'Sushi', spy: 'Sashimi', category: 'Food & Drink' },
  { normal: 'Cake', spy: 'Pie', category: 'Food & Drink' },
  { normal: 'Beer', spy: 'Wine', category: 'Food & Drink' },
  { normal: 'Chocolate', spy: 'Candy', category: 'Food & Drink' },
  { normal: 'Pasta', spy: 'Noodles', category: 'Food & Drink' },
  { normal: 'Steak', spy: 'Ribs', category: 'Food & Drink' },
  { normal: 'Lemonade', spy: 'Orange Juice', category: 'Food & Drink' },
  { normal: 'Croissant', spy: 'Muffin', category: 'Food & Drink' },
  { normal: 'Ice Cream', spy: 'Frozen Yogurt', category: 'Food & Drink' },
  { normal: 'Pancake', spy: 'Waffle', category: 'Food & Drink' },

  // Animals
  { normal: 'Dog', spy: 'Wolf', category: 'Animals' },
  { normal: 'Cat', spy: 'Tiger', category: 'Animals' },
  { normal: 'Horse', spy: 'Donkey', category: 'Animals' },
  { normal: 'Eagle', spy: 'Hawk', category: 'Animals' },
  { normal: 'Shark', spy: 'Whale', category: 'Animals' },
  { normal: 'Butterfly', spy: 'Moth', category: 'Animals' },
  { normal: 'Frog', spy: 'Toad', category: 'Animals' },
  { normal: 'Rabbit', spy: 'Hare', category: 'Animals' },
  { normal: 'Dolphin', spy: 'Seal', category: 'Animals' },
  { normal: 'Crow', spy: 'Raven', category: 'Animals' },
  { normal: 'Bee', spy: 'Wasp', category: 'Animals' },
  { normal: 'Turtle', spy: 'Tortoise', category: 'Animals' },

  // Activities
  { normal: 'Swimming', spy: 'Diving', category: 'Activities' },
  { normal: 'Running', spy: 'Jogging', category: 'Activities' },
  { normal: 'Painting', spy: 'Drawing', category: 'Activities' },
  { normal: 'Singing', spy: 'Humming', category: 'Activities' },
  { normal: 'Cooking', spy: 'Baking', category: 'Activities' },
  { normal: 'Reading', spy: 'Writing', category: 'Activities' },
  { normal: 'Dancing', spy: 'Ballet', category: 'Activities' },
  { normal: 'Skiing', spy: 'Snowboarding', category: 'Activities' },
  { normal: 'Fishing', spy: 'Hunting', category: 'Activities' },
  { normal: 'Yoga', spy: 'Meditation', category: 'Activities' },
  { normal: 'Camping', spy: 'Hiking', category: 'Activities' },
  { normal: 'Surfing', spy: 'Skateboarding', category: 'Activities' },

  // Objects
  { normal: 'Guitar', spy: 'Ukulele', category: 'Objects' },
  { normal: 'Laptop', spy: 'Tablet', category: 'Objects' },
  { normal: 'Umbrella', spy: 'Parasol', category: 'Objects' },
  { normal: 'Mirror', spy: 'Window', category: 'Objects' },
  { normal: 'Candle', spy: 'Lamp', category: 'Objects' },
  { normal: 'Wallet', spy: 'Purse', category: 'Objects' },
  { normal: 'Bicycle', spy: 'Scooter', category: 'Objects' },
  { normal: 'Watch', spy: 'Clock', category: 'Objects' },
  { normal: 'Couch', spy: 'Chair', category: 'Objects' },
  { normal: 'Pillow', spy: 'Cushion', category: 'Objects' },
  { normal: 'Sword', spy: 'Knife', category: 'Objects' },
  { normal: 'Camera', spy: 'Binoculars', category: 'Objects' },

  // Professions
  { normal: 'Doctor', spy: 'Nurse', category: 'Professions' },
  { normal: 'Lawyer', spy: 'Judge', category: 'Professions' },
  { normal: 'Teacher', spy: 'Professor', category: 'Professions' },
  { normal: 'Chef', spy: 'Baker', category: 'Professions' },
  { normal: 'Pilot', spy: 'Captain', category: 'Professions' },
  { normal: 'Detective', spy: 'Spy', category: 'Professions' },
  { normal: 'Firefighter', spy: 'Paramedic', category: 'Professions' },
  { normal: 'Architect', spy: 'Engineer', category: 'Professions' },
  { normal: 'Journalist', spy: 'Author', category: 'Professions' },
  { normal: 'Dentist', spy: 'Surgeon', category: 'Professions' },
];
