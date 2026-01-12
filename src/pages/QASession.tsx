import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThumbsUp, Send, MessageCircle, Users } from 'lucide-react';
import { qaSessions, sampleQuestions } from '@/lib/mock-data';

export default function QASession() {
  const { id } = useParams<{ id: string }>();
  const [newQuestion, setNewQuestion] = useState('');
  const [questions, setQuestions] = useState(sampleQuestions);

  const session = qaSessions.find(s => s.id === id) || qaSessions[0]; // Fallback to first

  const handleSubmitQuestion = () => {
    if (newQuestion.trim()) {
      const question = {
        id: Date.now().toString(),
        text: newQuestion,
        askedBy: 'You', // In real app, get from user
        upvotes: 0,
        isAnswered: false,
      };
      setQuestions(prev => [question, ...prev]);
      setNewQuestion('');
    }
  };

  const handleUpvote = (questionId: string) => {
    setQuestions(prev =>
      prev.map(q =>
        q.id === questionId ? { ...q, upvotes: q.upvotes + 1 } : q
      )
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{session.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={session.speaker.avatar} />
                <AvatarFallback>{session.speaker.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{session.speaker.name}</span>
              {session.status === 'live' && (
                <Badge className="bg-destructive animate-pulse">LIVE</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>1,234 watching</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video relative">
                  <img
                    src={session.thumbnail}
                    alt={session.title}
                    className="w-full h-full object-cover"
                  />
                  {session.status === 'live' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="text-center text-white">
                        <div className="w-16 h-16 bg-destructive rounded-full flex items-center justify-center mx-auto mb-4">
                          <div className="w-6 h-6 bg-white rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-lg font-semibold">Live Session in Progress</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Window */}
          <div className="space-y-4">
            {/* Submit Question */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Ask a Question
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your question here..."
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleSubmitQuestion} className="w-full gap-2">
                  <Send className="w-4 h-4" />
                  Submit Question
                </Button>
              </CardContent>
            </Card>

            {/* Questions List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Questions ({questions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64 md:h-96">
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <div key={question.id}>
                        <div className="flex gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{question.askedBy[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{question.askedBy}</span>
                              {question.isAnswered && (
                                <Badge variant="secondary" className="text-xs">Answered</Badge>
                              )}
                            </div>
                            <p className="text-sm mb-2">{question.text}</p>
                            {question.answer && (
                              <div className="bg-muted p-3 rounded-md mb-2">
                                <p className="text-sm">{question.answer}</p>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpvote(question.id)}
                              className="gap-1 h-8 px-2"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              {question.upvotes}
                            </Button>
                          </div>
                        </div>
                        {index < questions.length - 1 && <Separator className="mt-4" />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}