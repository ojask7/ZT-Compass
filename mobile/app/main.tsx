import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';

export default function MainScreen() {
  return (
    <WebView
      style={styles.webview}
      source={{ uri: 'https://ztcompass-demo-uidacxx6la-ew.a.run.app' }}
      startInLoadingState
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1 },
});
