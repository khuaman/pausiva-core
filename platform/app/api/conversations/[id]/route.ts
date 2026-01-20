import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/utils/supabase/service';
import { getAuthenticatedUser } from '../../auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser(request);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // Get conversation ID from params
    const { id } = await params;
    const conversationId = id;
    
    const supabase = getServiceSupabaseClient();

    // Fetch conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select(`
        id,
        thread_id,
        patient_id,
        phone,
        channel,
        status,
        action_type,
        agent_used,
        message_count,
        summary,
        risk_level,
        risk_score,
        started_at,
        ended_at
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError) {
      console.error('[api/conversations] Error fetching conversation', conversationError);
      return NextResponse.json(
        { error: 'Conversation not found.' },
        { status: 404 }
      );
    }

    // Fetch messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        external_id,
        role,
        content,
        agent_used,
        metadata,
        created_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[api/conversations] Error fetching messages', messagesError);
      return NextResponse.json(
        { error: 'Failed to fetch messages.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        conversation: {
          id: conversation.id,
          threadId: conversation.thread_id,
          patientId: conversation.patient_id,
          phone: conversation.phone,
          channel: conversation.channel,
          status: conversation.status,
          actionType: conversation.action_type,
          agentUsed: conversation.agent_used,
          messageCount: conversation.message_count,
          summary: conversation.summary,
          riskLevel: conversation.risk_level,
          riskScore: conversation.risk_score,
          startedAt: conversation.started_at,
          endedAt: conversation.ended_at,
        },
        messages: messages.map((msg) => ({
          id: msg.id,
          conversationId: msg.conversation_id,
          externalId: msg.external_id,
          role: msg.role,
          content: msg.content,
          agentUsed: msg.agent_used,
          metadata: msg.metadata,
          createdAt: msg.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('[api/conversations] Unexpected error', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching conversation.' },
      { status: 500 }
    );
  }
}

