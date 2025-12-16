/**
 * Servicio para integración con Meta (Facebook) API
 * Maneja el flujo OAuth 2.0 y la obtención de tokens
 */

const axios = require('axios');

const META_API_VERSION = 'v24.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const META_OAUTH_URL = 'https://www.facebook.com/v24.0/dialog/oauth';

class MetaApiService {
  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID;
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
    this.redirectUri = process.env.REDIRECT_URI;

    if (!this.appId || !this.appSecret) {
      console.warn('⚠️ Meta API credentials no configuradas correctamente');
    }
  }

  /**
   * Generar URL de autorización OAuth
   */
  generateAuthUrl(scopes = []) {
    const defaultScopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_manage_metadata',
      'pages_messaging'
    ];

    const scopeList = scopes.length > 0 ? scopes : defaultScopes;
    
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopeList.join(',')
    });

    return `${META_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Intercambiar code por Short-Lived User Access Token
   */
  async exchangeCodeForToken(code) {
    try {
      const url = `${META_BASE_URL}/oauth/access_token`;
      
      const params = {
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.redirectUri,
        code: code
      };

      console.log('🔄 Intercambiando code por Short-Lived Token...');
      
      const response = await axios.get(url, { params });
      
      const { access_token, token_type, expires_in } = response.data;
      
      console.log('✅ Short-Lived Token obtenido exitosamente');
      
      return {
        access_token,
        token_type,
        expires_in
      };
    } catch (error) {
      console.error('❌ Error intercambiando code por token:', error.response?.data || error.message);
      throw new Error('Error al intercambiar código de autorización');
    }
  }

  /**
   * Intercambiar Short-Lived Token por Long-Lived User Access Token
   */
  async exchangeForLongLivedToken(shortLivedToken) {
    try {
      const url = `${META_BASE_URL}/oauth/access_token`;
      
      const params = {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortLivedToken
      };

      console.log('🔄 Intercambiando por Long-Lived Token...');
      
      const response = await axios.get(url, { params });
      
      const { access_token, token_type, expires_in } = response.data;
      
      console.log('✅ Long-Lived Token obtenido exitosamente');
      console.log(`   Expira en: ${expires_in} segundos (${Math.floor(expires_in / 86400)} días)`);
      
      return {
        access_token,
        token_type,
        expires_in,
        expires_at: new Date(Date.now() + expires_in * 1000)
      };
    } catch (error) {
      console.error('❌ Error intercambiando por long-lived token:', error.response?.data || error.message);
      throw new Error('Error al obtener token de larga duración');
    }
  }

  /**
   * Obtener información del usuario de Facebook
   */
  async getUserInfo(accessToken) {
    try {
      const url = `${META_BASE_URL}/me`;
      
      const params = {
        access_token: accessToken,
        fields: 'id,name,email'
      };

      console.log('🔄 Obteniendo información del usuario...');
      
      const response = await axios.get(url, { params });
      
      console.log('✅ Información del usuario obtenida');
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo información del usuario:', error.response?.data || error.message);
      throw new Error('Error al obtener información del usuario');
    }
  }

  /**
   * Obtener todas las páginas de Facebook del usuario
   */
  async getUserPages(userAccessToken) {
    try {
      const url = `${META_BASE_URL}/me/accounts`;
      
      const params = {
        access_token: userAccessToken,
        fields: 'id,name,access_token,category,tasks'
      };

      console.log('🔄 Obteniendo páginas de Facebook...');
      
      const response = await axios.get(url, { params });
      
      const pages = response.data.data || [];
      
      console.log(`✅ ${pages.length} página(s) encontrada(s)`);
      
      return pages.map(page => ({
        page_id: page.id,
        page_name: page.name,
        page_category: page.category,
        page_access_token: page.access_token,
        tasks: page.tasks || []
      }));
    } catch (error) {
      console.error('❌ Error obteniendo páginas:', error.response?.data || error.message);
      throw new Error('Error al obtener páginas de Facebook');
    }
  }

  /**
   * Validar un token de acceso
   */
  async validateToken(accessToken) {
    try {
      const url = `${META_BASE_URL}/debug_token`;
      
      const params = {
        input_token: accessToken,
        access_token: `${this.appId}|${this.appSecret}`
      };

      const response = await axios.get(url, { params });
      
      const data = response.data.data;
      
      return {
        is_valid: data.is_valid,
        app_id: data.app_id,
        user_id: data.user_id,
        expires_at: data.expires_at,
        scopes: data.scopes || [],
        type: data.type
      };
    } catch (error) {
      console.error('❌ Error validando token:', error.response?.data || error.message);
      return { is_valid: false };
    }
  }

  /**
   * Obtener información de una página específica
   */
  async getPageInfo(pageId, accessToken) {
    try {
      const url = `${META_BASE_URL}/${pageId}`;
      
      const params = {
        access_token: accessToken,
        fields: 'id,name,category,about,phone,website,emails,fan_count,link'
      };

      const response = await axios.get(url, { params });
      
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo información de página:', error.response?.data || error.message);
      throw new Error('Error al obtener información de la página');
    }
  }

  /**
   * Flujo completo: Code -> Short-Lived -> Long-Lived -> Pages
   */
  async completeOAuthFlow(code) {
    try {
      console.log('🚀 Iniciando flujo OAuth completo...');
      
      // 1. Intercambiar code por short-lived token
      const shortLivedData = await this.exchangeCodeForToken(code);
      
      // 2. Intercambiar por long-lived token
      const longLivedData = await this.exchangeForLongLivedToken(shortLivedData.access_token);
      
      // 3. Obtener información del usuario
      const userInfo = await this.getUserInfo(longLivedData.access_token);
      
      // 4. Obtener páginas del usuario
      const pages = await this.getUserPages(longLivedData.access_token);
      
      console.log('✅ Flujo OAuth completado exitosamente');
      
      return {
        user: {
          facebook_user_id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email
        },
        user_access_token: longLivedData.access_token,
        token_expires_at: longLivedData.expires_at,
        pages: pages
      };
    } catch (error) {
      console.error('❌ Error en flujo OAuth:', error.message);
      throw error;
    }
  }
}

module.exports = new MetaApiService();

