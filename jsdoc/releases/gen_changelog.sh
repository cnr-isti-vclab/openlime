#!/bin/bash
s=$(git tag -l --sort=version:refname v*)
readarray -t a <<<"$s"
for i in "${!a[@]}" ; do 
  ! [[ ${a[$i]} =~ ^v[0-9]+\. ]] && unset -v 'a[$i]'
done

#if [[ "${#a[@]}" -gt 0 ]] 
#then
#    echo "### Tag ${a[0]}"
#    git tag -l --format='%(contents)' "${a[0]}"
#fi

if [[ "${#a[@]}" -gt 1 ]] 
then
    CURR="${a[0]}"
    PREV="${a[1]}"
    echo "### Commits" 
    git log --pretty=format:"- %s (%ci %cn)" ${PREV}...${CURR}
fi
