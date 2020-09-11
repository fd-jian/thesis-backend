# Experience 
## Django Backend
### Admin Account für ../admin
Zum erstellen eines Admin Accounts muss der Server nicht laufen. Auf dem
localhost reicht es, wenn man in den experiencesampling Ordner navigiert in dem
sich auch die 'manage.py' befindet. Hierfür in die cmd wechseln und den Befehl
"python manage.py createsuperuser" ausführen. Für den Docker Container muss 
man zunächst in diesen wechseln mit dem Befehl "docker-compose exec web /bin/bash".
Anschließend ersten Befehl ausführen.
### Neue Models erstellen und auf der Admin Page Registrieren.
Um neue Models zu erstellen müssen diese in der ExperienceSocket/models.py 
erstellt werden. Anschließend müssen diese in der ExperienceSocket/admin.py
registriert werden. Beispiele sind dort zu finden. Bevor man diese sehen kann
sollten die Befehle "python manage.py makemigration" und "python manage.py migrate"
ausgeführt werden, damit die Änderungen übernommen werden.

### Docker auf Windows Home
Für Windows Home gibt es nur die Alternative der DockerToolbox. Dadurch kann es
zu Routingproblem kommen, wenn man vom Smartphone auf den Docker Container im
lokalen Netzwerk zugreifen möchte. Ein möglicher Fix ist es die automatisch 
angelegte docker-machine default über das Oracle VM Virtualtool anzupassen.
Dazu in den Einstellungen zu der VM -> Netzwerk -> Adapter 1 -> Erweiterte Einstellungen
-> Port Weiterleitung -> neue Weiterleitung hinzufügen -> Host-IP und Gast-IP freilassen 
und bei Host-Port und Gast-Port das Port eintragen, welches im docker-compose File
für den den Web-Container hinterlegt ist (bspw. 8000). <br>
[Stackoverflow Beschreibung](https://stackoverflow.com/questions/33814696/how-to-connect-to-a-docker-container-from-outside-the-host-same-network-windo) <br>
[Docker Toolbox](https://docs.docker.com/toolbox/overview/)

### Zugriff auf Django im laufenden Docker Container (Windows)
Der Befehl  `docker-compose exec web /bin/bash ` bringt einem zu einem Terminal in dem der Container läuft.
Mittels `python manage.py shell` kommt man zur Interaktiven Console in Django Python.
Zur Ausgabe aller empfangenen DatabaseNotification muss man nur noch 
`from ExperienceSocket.models import DatabaseNotification`
`DatabaseNotification.objects.all()` ausführen. Hier können beispielsweise auch neue Surveys, Notifications ausgeführt oder editiert werden. 



## Android Application

## Old
### Wiki Google Doc
[Doc Link](https://docs.google.com/spreadsheets/d/1un-965-LAptT_QFSWqjXU4S76e3s4ppeOEl8tEc_oYo/edit?usp=sharing)








