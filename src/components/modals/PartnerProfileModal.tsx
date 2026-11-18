import React, { useEffect, useState } from 'react';
import { Calendar, MessageSquare, Star, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { submitPartnerReview, subscribeUserReviews } from '../../services/firestoreService';
import { ConnectionStatus, PartnerReview, UserProfile } from '../../types';
import {
  calculateMatchScore,
  formatRelativeTime,
  formatSlotLabel,
  getOverlappingSlots,
} from '../../utils/matching';
import { Avatar } from '../common/Avatar';

interface PartnerProfileModalProps {
  partner: UserProfile | null;
  connectionStatus?: ConnectionStatus | null;
  onClose: () => void;
  onConnect: (partner: UserProfile) => void;
  onMessage: (partner: UserProfile) => void;
  onSchedule: (partner: UserProfile) => void;
}

export function PartnerProfileModal({
  partner,
  connectionStatus,
  onClose,
  onConnect,
  onMessage,
  onSchedule,
}: PartnerProfileModalProps) {
  const { userProfile } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<PartnerReview[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [subject, setSubject] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!partner) return;
    setSubject(partner.subjects[0] || 'General Study');
    const unsub = subscribeUserReviews(partner.uid, setReviews);
    return () => unsub();
  }, [partner?.uid]);

  if (!partner) return null;

  const match = calculateMatchScore(userProfile, partner);
  const sharedSlots = getOverlappingSlots(userProfile, [partner]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !comment.trim()) return;
    setSubmitting(true);
    try {
      await submitPartnerReview({
        targetUserId: partner.uid,
        author: userProfile,
        rating,
        comment,
        subject,
      });
      setComment('');
      showToast('Review submitted', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to post review', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="partner-modal-name"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {match.score}% Academic Match
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close partner profile"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar
                src={partner.avatarUrl}
                name={partner.fullName}
                size="xl"
                showOnline
                isOnline={partner.isOnline}
              />
              <div>
                <h2 id="partner-modal-name" className="font-display text-2xl font-bold">
                  {partner.fullName}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {partner.course} · {partner.year}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {partner.university} · {partner.studyStyle} · {partner.studyMode}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums">
                  <span className="inline-flex items-center gap-1 font-semibold">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {partner.ratingAvg?.toFixed(1) || '5.0'} ({partner.reviewCount || 0} reviews)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{partner.sessionsCompleted || 0} sessions</span>
                  <span aria-hidden="true">·</span>
                  <span>{partner.streakDays || 0}d streak</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {connectionStatus === 'accepted' ? (
                <>
                  <button
                    type="button"
                    onClick={() => onMessage(partner)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </button>
                  <button
                    type="button"
                    onClick={() => onSchedule(partner)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Schedule
                  </button>
                </>
              ) : connectionStatus === 'pending' ? (
                <span className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium">
                  Request Pending
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onConnect(partner)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Connect
                </button>
              )}
            </div>
          </div>

          {partner.bio && (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{partner.bio}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Subjects & Strengths
              </h3>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {partner.subjects.join(' · ') || 'Not specified'}
              </p>
              {partner.strengths.length > 0 && (
                <p className="text-xs text-teal-700 dark:text-teal-400 mt-1.5">
                  Strong in: {partner.strengths.join(', ')}
                </p>
              )}
              {partner.weaknesses.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Improving: {partner.weaknesses.join(', ')}
                </p>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                Availability ({sharedSlots.length} overlapping slots)
              </h3>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {partner.availabilitySlots.map(formatSlotLabel).join(' · ') || 'Flexible'}
              </p>
              {sharedSlots.length > 0 && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 font-medium">
                  Shared: {sharedSlots.map(formatSlotLabel).join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Reviews */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="font-display text-base font-bold">Partner Reviews</h3>

            {reviews.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No written reviews yet. Leave the first review after studying together!
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar src={rev.authorAvatar} name={rev.authorName} size="sm" />
                        <div>
                          <p className="text-sm font-semibold">{rev.authorName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {rev.subject} · {formatRelativeTime(rev.createdAt?.toDate())}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {rev.rating}.0
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}

            {userProfile && userProfile.uid !== partner.uid && (
              <form
                onSubmit={handleReviewSubmit}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Leave a review for {partner.fullName.split(' ')[0]}
                  </span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        aria-label={`Rate ${star} stars`}
                        className="p-0.5"
                      >
                        <Star
                          className={`h-4 w-4 ${
                            star <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share how your study session went..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !comment.trim()}
                    className="px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
                  >
                    {submitting ? 'Posting...' : 'Post Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
