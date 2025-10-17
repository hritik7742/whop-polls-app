'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePollData) => Promise<void>;
  isSubmitting?: boolean;
}

interface CreatePollData {
  question: string;
  options: { option_text: string }[];
  expires_at: string;
  scheduled_at?: string;
  send_notification: boolean;
}

const EXPIRY_OPTIONS = [
  { value: '10s', label: '10 seconds (testing)' },
  { value: '12h', label: '12 hours' },
  { value: '24h', label: '24 hours (default)' },
  { value: '48h', label: '48 hours' },
  { value: '1w', label: '1 week' },
  { value: 'never', label: 'Never Expire' },
  { value: 'custom', label: 'Custom' },
];

const SCHEDULE_OPTIONS = [
  { value: 'now', label: 'Launch Now' },
  { value: '1h', label: 'In 1 hour' },
  { value: '6h', label: 'In 6 hours' },
  { value: '12h', label: 'In 12 hours' },
  { value: '1d', label: 'In 1 day' },
  { value: 'custom', label: 'Custom Date & Time' },
];

export function CreatePollDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false
}: CreatePollDialogProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState([
    { option_text: '' },
    { option_text: '' }
  ]);
  const [expiry, setExpiry] = useState('24h');
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [schedule, setSchedule] = useState('now');
  const [customScheduleDate, setCustomScheduleDate] = useState('');
  const [sendNotification, setSendNotification] = useState(true);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, { option_text: '' }]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index].option_text = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!question.trim() || options.some(opt => !opt.option_text.trim())) {
      return;
    }

    // Calculate expiry date
    const now = new Date();
    let expiresAt: Date;
    
    switch (expiry) {
      case '10s':
        expiresAt = new Date(now.getTime() + 10 * 1000); // 10 seconds for testing
        break;
      case '12h':
        expiresAt = new Date(now.getTime() + 12 * 60 * 60 * 1000);
        break;
      case '24h':
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case '48h':
        expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        break;
      case '1w':
        expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'never':
        // Set expiry to 10 years from now (effectively never expires)
        expiresAt = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customExpiryDate) {
          expiresAt = new Date(customExpiryDate);
        } else {
          expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24h
        }
        break;
      default:
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    // Calculate scheduled date
    let scheduledAt: string | undefined;
    if (schedule !== 'now') {
      let scheduleDate: Date;
      
      switch (schedule) {
        case '1h':
          scheduleDate = new Date(now.getTime() + 1 * 60 * 60 * 1000);
          break;
        case '6h':
          scheduleDate = new Date(now.getTime() + 6 * 60 * 60 * 1000);
          break;
        case '12h':
          scheduleDate = new Date(now.getTime() + 12 * 60 * 60 * 1000);
          break;
        case '1d':
          scheduleDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'custom':
          if (customScheduleDate) {
            scheduleDate = new Date(customScheduleDate);
          } else {
            scheduleDate = now;
          }
          break;
        default:
          scheduleDate = now;
      }
      
      scheduledAt = scheduleDate.toISOString();
    }

    await onSubmit({
      question: question.trim(),
      options: options.filter(opt => opt.option_text.trim()),
      expires_at: expiresAt.toISOString(),
      scheduled_at: scheduledAt,
      send_notification: sendNotification,
    });

    // Reset form
    setQuestion('');
    setOptions([{ option_text: '' }, { option_text: '' }]);
    setExpiry('24h');
    setCustomExpiryDate('');
    setSchedule('now');
    setCustomScheduleDate('');
    setSendNotification(true);
  };

  const isValid = question.trim().length > 0 && 
    options.filter(opt => opt.option_text.trim()).length >= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full mx-2 sm:mx-0 my-2 sm:my-0 p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Create Poll</DialogTitle>
          <DialogDescription>
            Create a new poll for your community to vote on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Poll Question */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Poll Question</label>
            <Input
              placeholder="Enter your poll question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Create a clear and concise question</span>
              <span>{question.length}/500</span>
            </div>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Answer Options</label>
              <span className="text-xs text-muted-foreground">
                {options.filter(opt => opt.option_text.trim()).length} of {options.length} options
              </span>
            </div>
            
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option.option_text}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    maxLength={100}
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {option.option_text.length}/100
                    </span>
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveOption(index)}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <Button
                variant="outline"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          {/* Poll Expiry */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Poll Expiry</label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Set when the poll will expire and stop accepting votes
            </p>
            
            {expiry === 'custom' && (
              <div className="mt-2">
                <Input
                  type="datetime-local"
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)} // Ensure future date
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select a future date and time for the poll to expire
                </p>
              </div>
            )}
          </div>

          {/* Poll Schedule */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Launch Schedule</label>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose when to launch your poll
            </p>
            
            {schedule === 'custom' && (
              <div className="mt-2">
                <Input
                  type="datetime-local"
                  value={customScheduleDate}
                  onChange={(e) => setCustomScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select a future date and time to launch the poll
                </p>
              </div>
            )}
          </div>

          {/* Additional Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notification"
                checked={sendNotification}
                onCheckedChange={(checked) => setSendNotification(!!checked)}
              />
              <div className="space-y-1">
                <label htmlFor="notification" className="text-sm font-medium">
                  Mention users (send push notification)
                </label>
                <p className="text-xs text-muted-foreground">
                  When enabled, a push notification is sent to your members for this poll. 
                  Disable to avoid pinging everyone.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : schedule === 'now' ? 'Create Poll' : 'Schedule Poll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
