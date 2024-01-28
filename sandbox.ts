import Sandbox from 'v8-sandbox';

const sandbox = new Sandbox();

const code = 'setResult({ value: 1 + inputValue });';

(async () => {
  const { error, value } = await sandbox.execute({ code, timeout: 3000, globals: { inputValue: 2 } });

  await sandbox.shutdown();

  //=> 3
})();