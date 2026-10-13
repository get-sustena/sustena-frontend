import type { IconName } from "../../ui/Icon";

export type ProfileQuestionField =
  | "nickname"
  | "gender"
  | "birthday"
  | "lifestyle"
  | "experience"
  | "habitFreq"
  | "habitWho"
  | "habitTime"
  | "goals"
  | "challenges"
  | "heard";

export type ProfileOption = {
  value: string;
  label: string;
  icon?: IconName;
  description?: string;
  level?: number;
};

export const PROFILE_QUESTION_META: Record<
  ProfileQuestionField,
  { row: string; question: string; why: string; icon: IconName }
> = {
  nickname: {
    row: "Nickname",
    question: "What should we call you?",
    why: "We'll use it to greet you on your home screen.",
    icon: "pencil",
  },
  gender: {
    row: "Gender",
    question: "Which best describes you?",
    why: "Helps fine-tune nutrition estimates.",
    icon: "profile",
  },
  birthday: {
    row: "Birthday",
    question: "When's your birthday?",
    why: "So we know when to celebrate you.",
    icon: "star",
  },
  lifestyle: {
    row: "Lifestyle",
    question: "Which of these sounds most like you?",
    why: "So meal ideas arrive when you can actually cook them.",
    icon: "home",
  },
  experience: {
    row: "Kitchen experience",
    question: "How do you feel in the kitchen?",
    why: "We'll match recipes to your comfort level.",
    icon: "chefHat",
  },
  habitFreq: {
    row: "How often you cook",
    question: "How often do you cook?",
    why: "Helps us pace your meal suggestions.",
    icon: "plan",
  },
  habitWho: {
    row: "Who you cook for",
    question: "Who do you usually cook for?",
    why: "Sets your default serving size.",
    icon: "servings",
  },
  habitTime: {
    row: "Time you usually have",
    question: "How much time do you usually have?",
    why: "So we never suggest a 60-minute meal on a busy night.",
    icon: "timer",
  },
  goals: {
    row: "Goals",
    question: "What would you like a hand with?",
    why: "We'll focus on what matters to you.",
    icon: "ncd",
  },
  challenges: {
    row: "Biggest challenges",
    question: "What gets in the way most?",
    why: "Pick up to three. We'll tackle these first.",
    icon: "undecided",
  },
  heard: {
    row: "How you found Sustena",
    question: "Where did you hear about us?",
    why: "No wrong answer. Feel free to skip.",
    icon: "market",
  },
};

export const GENDER_OPTIONS: ProfileOption[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

export const LIFESTYLE_OPTIONS: ProfileOption[] = [
  { value: "student", label: "I'm a student" },
  { value: "fulltime", label: "I work full-time" },
  { value: "remote", label: "I work remotely" },
  { value: "business", label: "I run my own business" },
  { value: "parent", label: "I'm a stay-at-home parent" },
  { value: "retired", label: "I'm retired" },
  { value: "jobseek", label: "I'm between jobs right now" },
  { value: "other", label: "Something else" },
];

export const REMOTE_FLEX_OPTIONS: ProfileOption[] = [
  { value: "flex", label: "Very flexible" },
  { value: "fixed", label: "Mostly fixed" },
];

export const EXPERIENCE_OPTIONS: ProfileOption[] = [
  { value: "beginner", label: "Beginner", description: "I have to follow recipes carefully.", level: 1 },
  { value: "intermediate", label: "Intermediate", description: "Everyday meals are easy for me.", level: 2 },
  { value: "advanced", label: "Advanced", description: "Complex recipes are easy for me.", level: 3 },
  { value: "pro", label: "Professional Chef", description: "I cook professionally.", level: 4 },
];

export const GOAL_OPTIONS: ProfileOption[] = [
  { value: "budget", label: "Stick to my food budget", icon: "budget" },
  { value: "kitchen", label: "Cook with what I already have", icon: "pantry" },
  { value: "health", label: "Eat healthier", icon: "ncd" },
  { value: "discover", label: "Find new recipes", icon: "discover" },
  { value: "shoplist", label: "Make grocery shopping easier", icon: "shop" },
  { value: "timesave", label: "Spend less time deciding", icon: "timer" },
];

export const CHALLENGE_OPTIONS: ProfileOption[] = [
  { value: "nowhat", label: "Deciding what to cook", icon: "undecided" },
  { value: "time", label: "Finding time to cook", icon: "timer" },
  { value: "overspend", label: "Spending too much on groceries", icon: "budget" },
  { value: "waste", label: "Food going to waste", icon: "vegetarian" },
  { value: "whatbuy", label: "Knowing what to buy", icon: "shop" },
  { value: "stress", label: "Cooking feels stressful", icon: "ncd" },
  { value: "picky", label: "Cooking for picky eaters", icon: "profile" },
  { value: "repeat", label: "Eating the same meals on repeat", icon: "swap" },
];

export const HABIT_WHO_OPTIONS: ProfileOption[] = [
  { value: "me", label: "Just me" },
  { value: "partner", label: "My partner and me" },
  { value: "family", label: "My family" },
  { value: "friends", label: "Friends, sometimes" },
  { value: "varies", label: "It varies week to week" },
];

export const HABIT_FREQ_OPTIONS: ProfileOption[] = [
  { value: "daily", label: "Most days" },
  { value: "4-6", label: "A few times a week" },
  { value: "2-3", label: "Once or twice a week" },
  { value: "occasional", label: "Now and then" },
  { value: "rarely", label: "Hardly ever" },
];

export const HABIT_TIME_OPTIONS: ProfileOption[] = [
  { value: "15", label: "Under 15 min" },
  { value: "15-30", label: "15–30 min" },
  { value: "30-45", label: "30–45 min" },
  { value: "45-60", label: "45–60 min" },
  { value: "60+", label: "Over an hour" },
];

export const HEARD_OPTIONS: ProfileOption[] = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "youtube", label: "YouTube" },
  { value: "google", label: "Google Search" },
  { value: "friend", label: "Friend or Family" },
  { value: "influencer", label: "Influencer" },
  { value: "playstore", label: "Google Play" },
  { value: "appstore", label: "App Store" },
  { value: "other", label: "Other" },
];

export function labelFor(options: ProfileOption[], value: string | null) {
  return options.find((option) => option.value === value)?.label;
}
