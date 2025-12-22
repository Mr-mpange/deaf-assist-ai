import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StudentResponsePanel } from './StudentResponsePanel';

export function CameraModalTest() {
  const [sessionId] = useState('test-session-123');
  const [studentId] = useState('test-student-456');
  const [studentName] = useState('Test Student');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Camera Modal Test</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            This is a test page to verify the camera modal appears in the center when responding to questions.
          </p>
          
          <StudentResponsePanel
            sessionId={sessionId}
            studentId={studentId}
            studentName={studentName}
          />
        </CardContent>
      </Card>
    </div>
  );
}