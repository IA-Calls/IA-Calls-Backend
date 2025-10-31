# Agent WebSockets

GET /v1/convai/conversation

Establish a WebSocket connection for real-time conversations with an AI agent.

Reference: https://elevenlabs.io/docs/agents-platform/api-reference/agents-platform/websocket

## AsyncAPI Specification

```yaml
asyncapi: 2.6.0
info:
  title: V 1 Convai Conversation
  version: subpackage_v1ConvaiConversation.v1ConvaiConversation
  description: >-
    Establish a WebSocket connection for real-time conversations with an AI
    agent.
channels:
  /v1/convai/conversation:
    description: >-
      Establish a WebSocket connection for real-time conversations with an AI
      agent.
    bindings:
      ws:
        query:
          type: object
          properties:
            agent_id:
              description: Any type
    publish:
      operationId: v-1-convai-conversation-publish
      summary: subscribe
      description: >-
        Defines the message types that can be received by the client from the
        server
      message:
        name: subscribe
        title: subscribe
        description: >-
          Defines the message types that can be received by the client from the
          server
        payload:
          $ref: '#/components/schemas/V1ConvaiConversationSubscribe'
    subscribe:
      operationId: v-1-convai-conversation-subscribe
      summary: publish
      description: Defines the message types that can be sent from client to server
      message:
        name: publish
        title: publish
        description: Defines the message types that can be sent from client to server
        payload:
          $ref: '#/components/schemas/V1ConvaiConversationPublish'
servers:
  Production:
    url: wss://api.elevenlabs.io/
    protocol: wss
    x-default: true
  Production-US:
    url: wss://api.us.elevenlabs.io/
    protocol: wss
  Production-EU:
    url: wss://api.eu.residency.elevenlabs.io/
    protocol: wss
  Production-India:
    url: wss://api.in.residency.elevenlabs.io/
    protocol: wss
components:
  schemas:
    ConversationInitiationMetadataConversationInitiationMetadataEvent:
      type: object
      properties:
        conversation_id:
          type: string
        agent_output_audio_format:
          type: string
        user_input_audio_format:
          type: string
    ConversationInitiationMetadata:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: conversation_initiation_metadata
        conversation_initiation_metadata_event:
          $ref: >-
            #/components/schemas/ConversationInitiationMetadataConversationInitiationMetadataEvent
    UserTranscriptUserTranscriptionEvent:
      type: object
      properties:
        user_transcript:
          type: string
    UserTranscript:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: user_transcript
        user_transcription_event:
          $ref: '#/components/schemas/UserTranscriptUserTranscriptionEvent'
    AgentResponseAgentResponseEvent:
      type: object
      properties:
        agent_response:
          type: string
      required:
        - agent_response
    AgentResponse:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: agent_response
        agent_response_event:
          $ref: '#/components/schemas/AgentResponseAgentResponseEvent'
      required:
        - type
    AgentResponseCorrectionAgentResponseCorrectionEvent:
      type: object
      properties:
        original_agent_response:
          type: string
        corrected_agent_response:
          type: string
      required:
        - original_agent_response
        - corrected_agent_response
    AgentResponseCorrection:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: agent_response_correction
        agent_response_correction_event:
          $ref: >-
            #/components/schemas/AgentResponseCorrectionAgentResponseCorrectionEvent
      required:
        - type
    AudioResponseAudioEvent:
      type: object
      properties:
        audio_base_64:
          type: string
        event_id:
          type: integer
    AudioResponse:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: audio
        audio_event:
          $ref: '#/components/schemas/AudioResponseAudioEvent'
      required:
        - type
    InterruptionInterruptionEvent:
      type: object
      properties:
        event_id:
          type: integer
    Interruption:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: interruption
        interruption_event:
          $ref: '#/components/schemas/InterruptionInterruptionEvent'
      required:
        - type
    PingPingEvent:
      type: object
      properties:
        event_id:
          type: integer
        ping_ms:
          type: integer
    Ping:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: ping
        ping_event:
          $ref: '#/components/schemas/PingPingEvent'
      required:
        - type
    ClientToolCallClientToolCall:
      type: object
      properties:
        tool_name:
          type: string
        tool_call_id:
          type: string
        parameters:
          type: object
          additionalProperties:
            description: Any type
    ClientToolCall:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: client_tool_call
        client_tool_call:
          $ref: '#/components/schemas/ClientToolCallClientToolCall'
      required:
        - type
    ContextualUpdate:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: contextual_update
        text:
          type: string
      required:
        - type
        - text
    VadScoreVadScoreEvent:
      type: object
      properties:
        vad_score:
          type: number
          format: double
      required:
        - vad_score
    VadScore:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: vad_score
        vad_score_event:
          $ref: '#/components/schemas/VadScoreVadScoreEvent'
      required:
        - type
    InternalTentativeAgentResponseTentativeAgentResponseInternalEvent:
      type: object
      properties:
        tentative_agent_response:
          type: string
      required:
        - tentative_agent_response
    InternalTentativeAgentResponse:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: internal_tentative_agent_response
        tentative_agent_response_internal_event:
          $ref: >-
            #/components/schemas/InternalTentativeAgentResponseTentativeAgentResponseInternalEvent
      required:
        - type
    V1ConvaiConversationSubscribe:
      oneOf:
        - $ref: '#/components/schemas/ConversationInitiationMetadata'
        - $ref: '#/components/schemas/UserTranscript'
        - $ref: '#/components/schemas/AgentResponse'
        - $ref: '#/components/schemas/AgentResponseCorrection'
        - $ref: '#/components/schemas/AudioResponse'
        - $ref: '#/components/schemas/Interruption'
        - $ref: '#/components/schemas/Ping'
        - $ref: '#/components/schemas/ClientToolCall'
        - $ref: '#/components/schemas/ContextualUpdate'
        - $ref: '#/components/schemas/VadScore'
        - $ref: '#/components/schemas/InternalTentativeAgentResponse'
    UserAudioChunk:
      type: object
      properties:
        user_audio_chunk:
          type: string
    Pong:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: pong
        event_id:
          type: integer
      required:
        - type
    ConversationInitiationClientDataConversationConfigOverrideAgentPrompt:
      type: object
      properties:
        prompt:
          type: string
    ConversationInitiationClientDataConversationConfigOverrideAgent:
      type: object
      properties:
        prompt:
          $ref: >-
            #/components/schemas/ConversationInitiationClientDataConversationConfigOverrideAgentPrompt
        first_message:
          type: string
        language:
          type: string
    ConversationInitiationClientDataConversationConfigOverrideTts:
      type: object
      properties:
        voice_id:
          type: string
    ConversationInitiationClientDataConversationConfigOverride:
      type: object
      properties:
        agent:
          $ref: >-
            #/components/schemas/ConversationInitiationClientDataConversationConfigOverrideAgent
        tts:
          $ref: >-
            #/components/schemas/ConversationInitiationClientDataConversationConfigOverrideTts
    ConversationInitiationClientDataCustomLlmExtraBody:
      type: object
      properties:
        temperature:
          type: number
          format: double
        max_tokens:
          type: integer
    ConversationInitiationClientDataDynamicVariables:
      oneOf:
        - type: string
        - type: number
          format: double
        - type: integer
        - type: boolean
    ConversationInitiationClientData:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: conversation_initiation_client_data
        conversation_config_override:
          $ref: >-
            #/components/schemas/ConversationInitiationClientDataConversationConfigOverride
        custom_llm_extra_body:
          $ref: >-
            #/components/schemas/ConversationInitiationClientDataCustomLlmExtraBody
        dynamic_variables:
          type: object
          additionalProperties:
            $ref: >-
              #/components/schemas/ConversationInitiationClientDataDynamicVariables
      required:
        - type
    ClientToolResult:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: client_tool_result
        tool_call_id:
          type: string
        result:
          type: string
        is_error:
          type: boolean
      required:
        - type
    UserMessage:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: user_message
        text:
          type: string
      required:
        - type
    UserActivity:
      type: object
      properties:
        type:
          type: string
          enum:
            - type: stringLiteral
              value: user_activity
      required:
        - type
    V1ConvaiConversationPublish:
      oneOf:
        - $ref: '#/components/schemas/UserAudioChunk'
        - $ref: '#/components/schemas/Pong'
        - $ref: '#/components/schemas/ConversationInitiationClientData'
        - $ref: '#/components/schemas/ClientToolResult'
        - $ref: '#/components/schemas/ContextualUpdate'
        - $ref: '#/components/schemas/UserMessage'
        - $ref: '#/components/schemas/UserActivity'

```