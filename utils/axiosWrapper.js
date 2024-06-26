const axios = require('axios');

class AxiosWrapper {
  async get(url, params) {
    let axiosPromise = axios.get(url);
    if (params) {
      axiosPromise = axios.get(url, {
        params,
      });
    }

    return axiosPromise
      .then((response) => (response.data))
      .catch((ex) => {
        return {
          error: 1,
          message: ex.message,
        };
      });
  }

  async post(url, data, header) {
    const headers = {
      headers:
      {
        'Content-Type': 'application/json',
      },
    };
    return axios.post(url, data, headers)
      .then((response) => (response.data))
      .catch((error) => {
        const er = {};
        if (error.response) {
          /*
           * The request was made and the server responded with a
           * status code that falls out of the range of 2xx
           */
          er.data = error.response.data.data;
          er.status = error.response.status;

        } else if (error.request) {
          /*
           * The request was made but no response was received, `error.request`
           * is an instance of XMLHttpRequest in the browser and an instance
           * of http.ClientRequest in Node.js
           */
          er.request = error.request;
        } else {
          // Something happened in setting up the request and triggered an Error
          er.message = error.message;
        }
        return {
          error: 1,
          message: er,
        };
      });
  }

  async delete(url, data, header) {
    const headers = {
      headers:
      {
        'Content-Type': 'application/json',
      },
    };
    return axios.delete(url, data, headers)
      .then((response) => (response.data))
      .catch((ex) => {
        return {
          error: 1,
          message: ex.message,
        };
      });
  }

  async put(url, data = {}, header) {
    const headers = {
      headers:
      {
        'Content-Type': 'application/json',
      },
    };

    return axios.put(url, data, headers)
      .then((response) => (response.data))
      .catch((ex) => {
        return {
          error: 1,
          message: ex.message,
        };
      });
  }
}

module.exports = new AxiosWrapper();
