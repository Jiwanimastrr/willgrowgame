import { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

function SentencePuzzlePlayer({ pin, nickname }) {
  const [tokens, setTokens] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    socket.on('playerNewPuzzle', ({ tokens }) => {
      setTokens(tokens);
      setResult(null);
    });

    socket.on('puzzleCorrectAnswer', ({ winnerId, winnerNickname }) => {
      if (winnerId === socket.id) {
        setResult('correct');
      } else {
        setResult(`Winner: ${winnerNickname}`);
      }
    });

    return () => {
      socket.off('playerNewPuzzle');
      socket.off('puzzleCorrectAnswer');
    };
  }, []);

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tokens);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTokens(items);
  };

  const handleSubmit = () => {
    const submittedSentence = tokens.map(t => t.text).join(' ');
    socket.emit('submitSentence', { pin, submittedSentence });
    setResult('waiting');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem' }}>
      <h2 style={{ fontSize: '2rem', textAlign: 'center', color: 'var(--ow-red)', margin: '1rem 0' }}>SENTENCE RACE</h2>
      
      {tokens.length > 0 ? (
        <div className="ow-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '1rem', transform: 'skewX(-2deg)' }}>
          {result && result !== 'waiting' ? (
             <div style={{ textAlign: 'center', margin: 'auto', transform: 'skewX(2deg)' }}>
               <h1 style={{ fontSize: '3rem', margin: 0, color: result === 'correct' ? 'var(--ow-green)' : 'var(--ow-red)' }}>
                 {result === 'correct' ? 'CORRECT!' : result}
               </h1>
             </div>
          ) : (
            <div style={{ transform: 'skewX(2deg)', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.5rem', textAlign: 'center', fontFamily: 'Noto Sans KR', fontWeight: 700, marginBottom: '2rem', color: '#666' }}>
                드래그하여 올바른 순서로 맞추세요
              </h3>
              
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="sentenceArea" direction="vertical">
                  {(provided) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}
                    >
                      {tokens.map((token, index) => (
                        <Draggable key={token.id} draggableId={token.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                userSelect: 'none',
                                padding: '1rem',
                                margin: '0 0 8px 0',
                                backgroundColor: snapshot.isDragging ? 'var(--ow-orange)' : 'var(--ow-darker)',
                                color: 'white',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                fontFamily: 'Noto Sans KR',
                                textAlign: 'center',
                                borderRadius: '4px',
                                boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)',
                                ...provided.draggableProps.style,
                              }}
                            >
                              {token.text}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              <button 
                className="ow-button red" 
                onClick={handleSubmit} 
                disabled={result === 'waiting'}
                style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '2rem' }}
              >
                <span style={{ transform: 'skewX(10deg)' }}>{result === 'waiting' ? 'WAIT...' : 'SUBMIT'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h1 style={{ fontSize: '3rem', color: 'rgba(255,255,255,0.5)' }}>WAITING FOR PUZZLE...</h1>
        </div>
      )}
    </div>
  );
}

export default SentencePuzzlePlayer;
