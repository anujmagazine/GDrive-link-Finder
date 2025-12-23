
export interface GDriveLink {
  id: string;
  url: string;
  title: string;
  purpose: string;
  tags: string[];
  category: string;
  dateAdded: number;
}

export type Category = 'Work' | 'Personal' | 'Projects' | 'Education' | 'Other';

export interface AIAnalysisResult {
  suggestedTags: string[];
  suggestedCategory: Category;
  summary: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
