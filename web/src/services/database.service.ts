import { supabase } from '../lib/supabase';

export interface Profile {
  id: number;
  total_responses: number;
  engagement_score: number;
  metadata: any;
}

export interface Question {
  id: number;
  text: string;
  question_type: string;
  difficulty_level: number;
  primary_dimension_id: number;
  options?: any[];
}

export interface Response {
  profile_id: number;
  question_id: number;
  answer_option_id: number;
  response_time_ms: number;
  confidence_level: number;
}

export const databaseService = {
  async getProfile(id: number = 1) {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Profile;
  },

  async fetchQuestions(limit: number = 10) {
    const { data, error } = await supabase
      .from('questions')
      .select(`
        *,
        options:answer_options(*)
      `)
      .eq('active', true)
      .limit(limit);

    if (error) throw error;
    return data as Question[];
  },

  async submitResponse(response: Response) {
    const { data, error } = await supabase
      .from('responses')
      .insert([response])
      .select();

    if (error) throw error;
    return data;
  },

  async getAnalytics(profileId: number = 1) {
    const { data, error } = await supabase
      .from('responses')
      .select(`
        *,
        question:questions(primary_dimension_id)
      `)
      .eq('profile_id', profileId);

    if (error) throw error;
    return data;
  },

  async getPatterns(profileId: number = 1) {
    const { data, error } = await supabase
      .from('patterns')
      .select('*')
      .eq('profile_id', profileId);

    if (error) throw error;
    return data;
  }
};
