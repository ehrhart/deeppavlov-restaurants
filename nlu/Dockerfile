FROM python:3

# Setup the virtualenv
#ENV VIRTUAL_ENV=/opt/venv
#ENV PATH="$VIRTUAL_ENV/bin:$PATH"
#RUN [ "python", "-m", "venv", "$VIRTUAL_ENV" ]

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY . .

# Install python dependencies
RUN [ "python", "-m", "pip", "install", "-r", "requirements.txt" ]
RUN [ "python", "-m", "pip", "install", "pybind11==2.2.3" ]
RUN [ "python", "-m", "pip", "install", "git+https://github.com/deepmipt/fastText.git#egg=fastText==0.8.22" ]

# Download spacy
RUN [ "python", "-m", "spacy", "download", "en_core_web_sm" ]

# Download DeepPavlov datasets for our model
RUN [ "python", "-m", "deeppavlov", "download", "model_config.json" ]
RUN [ "python", "-m", "deeppavlov", "download", "intents.json" ]

EXPOSE 5000
CMD [ "python", "-m", "deeppavlov", "riseapi", "model_config.json", "-p", "5000" ]