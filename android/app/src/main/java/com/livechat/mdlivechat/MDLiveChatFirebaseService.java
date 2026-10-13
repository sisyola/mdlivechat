package com.livechat.mdlivechat;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MDLiveChatFirebaseService extends FirebaseMessagingService {

    private static final String TAG = "MDLIVECHAT_FCM";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "FCM Token: " + token);

        // Store token - will be picked up by Capacitor plugin
        try {
            Class.forName("com.getcapacitor.Journal");
        } catch (Exception e) {
            Log.e(TAG, "Capacitor Journal not available");
        }
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        String title = "New Message";
        String body = "You have a new chat";

        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle() != null ?
                remoteMessage.getNotification().getTitle() : title;
            body = remoteMessage.getNotification().getBody() != null ?
                remoteMessage.getNotification().getBody() : body;
        }

        // Check for data payload
        if (remoteMessage.getData().size() > 0) {
            String dataTitle = remoteMessage.getData().get("title");
            String dataBody = remoteMessage.getData().get("body");
            if (dataTitle != null) title = dataTitle;
            if (dataBody != null) body = dataBody;
        }

        showNotification(title, body);
    }

    private void showNotification(String title, String body) {
        String channelId = "mdlivechat_chat";

        Intent intent = new Intent(this, BridgeActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
            .setSmallIcon(getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);

        NotificationManager notificationManager =
            (NotificationManager) getSystemService(NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                channelId, "LiveChat Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Chat notifications");
            notificationManager.createNotificationChannel(channel);
        }

        notificationManager.notify(0, builder.build());
    }
}
