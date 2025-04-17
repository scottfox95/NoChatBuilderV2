// Simple Chat Widget
(function() {
  // Get the current script tag
  const currentScript = document.currentScript;
  const chatbotId = currentScript.getAttribute('data-chatbot-id');
  
  if (!chatbotId) {
    console.error('Chatbot Widget Error: No chatbot-id provided');
    return;
  }
  
  // Get the base URL from the current script
  const scriptSrc = currentScript.src;
  const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
  const chatbotUrl = `${baseUrl}/../care-aid/${chatbotId}`;
  
  // Create widget styles
  const style = document.createElement('style');
  style.textContent = `
    .chat-widget-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #3b82f6;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      transition: all 0.3s ease;
    }
    
    .chat-widget-bubble:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    
    .chat-widget-container {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 350px;
      height: 500px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      display: none;
    }
    
    .chat-widget-container.visible {
      display: block;
    }
    
    .chat-widget-iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  `;
  document.head.appendChild(style);
  
  // Create chat bubble
  const bubble = document.createElement('div');
  bubble.className = 'chat-widget-bubble';
  bubble.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
  
  // Create chat container
  const container = document.createElement('div');
  container.className = 'chat-widget-container';
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.className = 'chat-widget-iframe';
  iframe.src = chatbotUrl;
  container.appendChild(iframe);
  
  // Add elements to the DOM
  document.body.appendChild(bubble);
  document.body.appendChild(container);
  
  // Toggle chat on bubble click
  bubble.addEventListener('click', function() {
    container.classList.toggle('visible');
  });
})();